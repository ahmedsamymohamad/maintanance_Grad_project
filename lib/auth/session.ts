import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

const SESSION_COOKIE_NAME = 'app_session'
const SESSION_TTL_DAYS = 7

function isMissingAuthTableError(message?: string | null) {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes("could not find the table 'public.app_users'")
    || normalized.includes("could not find the table 'public.auth_sessions'")
}

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  const supabase = createAdminClient()
  const { error } = await supabase.from('auth_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    if (isMissingAuthTableError(error.message)) {
      throw new Error('Auth database is not initialized. Run scripts/004_custom_auth.sql in Supabase SQL Editor.')
    }
    throw new Error(error.message)
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    const supabase = createAdminClient()
    await supabase.from('auth_sessions').delete().eq('token_hash', hashToken(token))
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const tokenHash = hashToken(token)
  const nowIso = new Date().toISOString()
  const supabase = createAdminClient()

  const { data: session, error: sessionError } = await supabase
    .from('auth_sessions')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .gt('expires_at', nowIso)
    .single()

  if (sessionError && !isMissingAuthTableError(sessionError.message)) {
    cookieStore.delete(SESSION_COOKIE_NAME)
    return null
  }

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME)
    return null
  }

  const { data: user, error: userError } = await supabase
    .from('app_users')
    .select('id, email, full_name, role')
    .eq('id', session.user_id)
    .eq('is_active', true)
    .single()

  if (userError && !isMissingAuthTableError(userError.message)) {
    await supabase.from('auth_sessions').delete().eq('id', session.id)
    cookieStore.delete(SESSION_COOKIE_NAME)
    return null
  }

  if (!user) {
    await supabase.from('auth_sessions').delete().eq('id', session.id)
    cookieStore.delete(SESSION_COOKIE_NAME)
    return null
  }

  return user as AuthUser
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  return user
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireCurrentUser()

  if (!roles.includes(user.role)) {
    redirect('/dashboard')
  }

  return user
}
