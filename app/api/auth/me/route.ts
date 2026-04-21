import { getCurrentUser } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get the current user from server-side session
    const user = await getCurrentUser()

    if (!user) {
      console.log('[/api/auth/me] No authenticated user found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('[/api/auth/me] User authenticated:', { id: user.id, role: user.role, email: user.email })

    // Return the user data
    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    })
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
