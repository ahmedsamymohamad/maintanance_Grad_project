import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function env(name: string) {
  const value = process.env[name]
  if (!value) return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey =
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ??
    env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

export function createAdminClient() {
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const publicKey =
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ??
    env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  return createSupabaseClient(supabaseUrl!, serviceRoleKey || publicKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createServiceRoleClient() {
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Add it to .env and restart the app.')
  }

  return createSupabaseClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
