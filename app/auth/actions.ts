'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createSession, clearSession, getCurrentUser } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import type { UserRole } from '@/lib/types'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const ALLOWED_ROLES: UserRole[] = ['admin', 'technician', 'user']
const AUTH_SCHEMA_ERROR = 'Auth database is not initialized. Run scripts/004_custom_auth.sql in Supabase SQL Editor, then retry.'

function isMissingAuthTableError(message?: string | null) {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes("could not find the table 'public.app_users'")
    || normalized.includes("could not find the table 'public.auth_sessions'")
}

function normalizeRole(role: string | null): UserRole {
  if (role && ALLOWED_ROLES.includes(role as UserRole)) {
    return role as UserRole
  }

  return 'user'
}

export async function signIn(formData: FormData) {
  const supabase = createAdminClient()

  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string

  const { data: user, error } = await supabase
    .from('app_users')
    .select('id, password_hash, is_active')
    .eq('email', email)
    .single()

  if (error || !user || !user.is_active) {
    if (isMissingAuthTableError(error?.message)) {
      return { error: AUTH_SCHEMA_ERROR }
    }
    return { error: 'Invalid email or password.' }
  }

  const validPassword = await verifyPassword(password, user.password_hash)

  if (!validPassword) {
    return { error: 'Invalid email or password.' }
  }

  await createSession(user.id)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  const supabase = createAdminClient()

  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = ((formData.get('fullName') as string) || '').trim() || null
  const requestedRole = normalizeRole((formData.get('role') as string) || 'user')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  const { count, error: countError } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true })

  if (countError) {
    if (isMissingAuthTableError(countError.message)) {
      return { error: AUTH_SCHEMA_ERROR }
    }
    return { error: 'Unable to verify sign-up rules. Please try again.' }
  }

  const currentUser = await getCurrentUser()
  const isFirstUser = (count ?? 0) === 0

  let roleToAssign: UserRole = 'user'

  if (isFirstUser) {
    roleToAssign = requestedRole
  } else if (currentUser?.role === 'admin') {
    roleToAssign = requestedRole
  } else if (requestedRole !== 'user') {
    return { error: 'Only an admin can create admin or technician accounts.' }
  }

  const { data: existingUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    return { error: 'An account with this email already exists.' }
  }

  const passwordHash = await hashPassword(password)

  const { data: newUser, error: createUserError } = await supabase
    .from('app_users')
    .insert({
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role: roleToAssign,
      created_by: currentUser?.id ?? null,
    })
    .select('id, email, full_name, role')
    .single()

  if (createUserError || !newUser) {
    if (isMissingAuthTableError(createUserError?.message)) {
      return { error: AUTH_SCHEMA_ERROR }
    }
    return { error: createUserError?.message ?? 'Failed to create account.' }
  }

  await supabase.from('profiles').upsert({
    id: newUser.id,
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
  })

  if (currentUser?.role === 'admin' && !isFirstUser) {
    revalidatePath('/dashboard/users')
    return { success: true, message: 'Account created successfully.' }
  }

  await createSession(newUser.id)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function getSignupPolicy() {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true })

  if (error) {
    if (isMissingAuthTableError(error.message)) {
      return {
        allowElevatedRoles: false,
        isFirstUser: false,
        error: AUTH_SCHEMA_ERROR,
      }
    }

    return {
      allowElevatedRoles: false,
      isFirstUser: false,
      error: 'Failed to load signup policy.',
    }
  }

  const currentUser = await getCurrentUser()
  const isFirstUser = (count ?? 0) === 0
  const allowElevatedRoles = isFirstUser || currentUser?.role === 'admin'

  return {
    allowElevatedRoles,
    isFirstUser,
    error: null,
  }
}

export async function signOut() {
  await clearSession()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function getUser() {
  return await getCurrentUser()
}

export async function getUserProfile() {
  const supabase = createAdminClient()
  const user = await getCurrentUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile
}

export async function updateUserRole(userId: string, role: UserRole) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const nextRole = normalizeRole(role)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('app_users')
    .update({ role: nextRole })
    .eq('id', userId)

  if (error) {
    if (isMissingAuthTableError(error.message)) {
      return { error: AUTH_SCHEMA_ERROR }
    }
    return { error: error.message }
  }

  await supabase
    .from('profiles')
    .update({ role: nextRole })
    .eq('id', userId)

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function adminCreateAccount(input: {
  email: string
  password: string
  fullName?: string
  role: UserRole
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const supabase = createAdminClient()
  const email = (input.email || '').trim().toLowerCase()
  const password = input.password || ''
  const fullName = (input.fullName || '').trim() || null
  const role = normalizeRole(input.role)

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  const { data: existingUser, error: existingError } = await supabase
    .from('app_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingError && isMissingAuthTableError(existingError.message)) {
    return { error: AUTH_SCHEMA_ERROR }
  }

  if (existingUser) {
    return { error: 'An account with this email already exists.' }
  }

  const passwordHash = await hashPassword(password)

  const { data: newUser, error: createError } = await supabase
    .from('app_users')
    .insert({
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role,
      created_by: currentUser.id,
    })
    .select('id, email, full_name, role')
    .single()

  if (createError || !newUser) {
    if (isMissingAuthTableError(createError?.message)) {
      return { error: AUTH_SCHEMA_ERROR }
    }
    return { error: createError?.message ?? 'Failed to create account.' }
  }

  await supabase.from('profiles').upsert({
    id: newUser.id,
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
  })

  revalidatePath('/dashboard/users')
  return { success: true, message: 'Account created successfully.' }
}
