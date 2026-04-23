'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Calendar, Edit2, Check, X, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ full_name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch profile on mount
  useEffect(() => {
    console.log('[ProfilePage] Component mounted, initializing auth...')
    
    let isMounted = true
    const authCheckTimeout = setTimeout(() => {
      if (isMounted && loading && !profile) {
        console.warn('[ProfilePage] Auth check timeout - session might not be available')
        // Don't show error yet - user might still be authenticating
      }
    }, 5000)

    const initializeAuth = async () => {
      try {
        // Try to get the current session from Supabase
        // Note: For custom auth systems, this might return null client-side
        // even when user is authenticated server-side
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return

        console.log('[ProfilePage] Session check result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: sessionError?.message 
        })

        if (session?.user?.id) {
          console.log('[ProfilePage] Valid session found, fetching profile...')
          await fetchProfile(session.user.id)
          return
        }

        // Session not available - this is expected for custom auth systems
        // The server already authenticated this route, so we can try fetching
        // the current user profile directly
        console.log('[ProfilePage] No Supabase session found - using server auth fallback...')
        await fetchCurrentUserProfile()
        
      } catch (err) {
        console.error('[ProfilePage] Error in initializeAuth:', err)
        if (isMounted) {
          setError('Failed to initialize authentication. Please refresh the page.')
        }
      }
    }

    // Initialize auth immediately
    initializeAuth()

    // Also listen for auth state changes (for future logouts)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      console.log('[ProfilePage] Auth state event:', { event, userId: session?.user?.id })
      
      if (event === 'SIGNED_OUT') {
        console.log('[ProfilePage] User signed out')
        setProfile(null)
        setError('Your session has ended. Please log in again.')
        setLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[ProfilePage] Token refreshed')
        return
      }

      if (session?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        console.log('[ProfilePage] Session state available, fetching profile...')
        setError('')
        await fetchProfile(session.user.id)
      }
    })

    // Cleanup function
    return () => {
      isMounted = false
      subscription?.unsubscribe()
      clearTimeout(authCheckTimeout)
    }
  }, [])

  // Fallback: fetch profile using current user endpoint (works with custom auth)
  async function fetchCurrentUserProfile() {
    try {
      console.log('[ProfilePage] Fetching current user profile via server endpoint...')
      setLoading(true)
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('[ProfilePage] API returned status:', response.status)
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(`API error: ${response.status}`)
      }

      const userData = await response.json()
      console.log('[ProfilePage] User data from API:', { id: userData.id, role: userData.role })

      if (userData?.id) {
        await fetchProfile(userData.id)
      } else {
        throw new Error('No user data in response')
      }
    } catch (err) {
      console.error('[ProfilePage] Error fetching current user:', err)
      // This is NOT an error state - the session might just not be loaded yet
      // Keep loading state and wait for session to be available
      console.log('[ProfilePage] Keeping loading state, waiting for auth...')
      setLoading(true)
    }
  }


  async function fetchProfile(userId: string) {
    try {
      setLoading(true)
      console.log('[ProfilePage] Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[ProfilePage] Profile fetch error:', error)
        throw error
      }
      
      console.log('[ProfilePage] Profile loaded successfully:', { role: data?.role, email: data?.email })
      setProfile(data)
      setFormData({ full_name: data.full_name || '' })
    } catch (err) {
      console.error('[ProfilePage] Error in fetchProfile:', err)
      setError('Failed to load profile. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (!profile?.id) {
        console.error('[ProfilePage] No profile ID found during save')
        setError('Error: Profile data not loaded. Please refresh.')
        setSaving(false)
        return
      }

      console.log('[ProfilePage] Starting profile save for user:', profile.id)

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name })
        .eq('id', profile.id)

      if (error) {
        console.error('[ProfilePage] Save error:', error)
        throw error
      }

      console.log('[ProfilePage] Profile updated successfully')
      setProfile({ ...profile, full_name: formData.full_name })
      setEditing(false)
      setSuccess('Profile updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('[ProfilePage] Error in handleSave:', err)
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    console.log('[ProfilePage] Rendering loading state')
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    console.warn('[ProfilePage] Rendering error state:', error)
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-red-600">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            </div>
            <div>
              <p className="text-sm text-red-800 font-medium">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Reload Page
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    console.warn('[ProfilePage] No profile data - waiting for load')
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600 font-medium">Preparing profile...</p>
        </div>
      </div>
    )
  }

  console.log('[ProfilePage] Rendering profile page with data')

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700'
      case 'technician':
        return 'bg-blue-100 text-blue-700'
      case 'user':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight ">Profile Settings</h1>
        <p className="text-base text-slate-500">Manage your account information</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Profile Card */}
      <Card className="border border-slate-200/50 shadow-sm">
        <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50/80 to-blue-50/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold  mb-1">Personal Information</CardTitle>
              <CardDescription className="">Your account details and settings</CardDescription>
            </div>
            <Button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className={`${
         'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600'
                  
              } text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-lg`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>

        <CardContent className="pt-6 space-y-6">
          {/* Profile Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center shadow-md">
              <User className="h-12 w-12 text-white" />
            </div>
            <div>
              <p className="text-sm">Profile Picture</p>
              <p className=" font-semibold">{profile?.full_name || 'User'}</p>
              <p className="text-xs mt-1">Avatar generated from initials</p>
            </div>
          </div>

          <div className="h-px bg-slate-200/50"></div>

          {/* Full Name */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Full Name
            </label>
            {editing ? (
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ full_name: e.target.value })}
                placeholder="Enter your full name"
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className=" font-medium">{profile?.full_name || 'Not provided'}</p>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-600" />
              Email Address
            </label>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className=" font-medium break-all">{profile?.email}</p>
              <p className="text-xs text-slate-500 mt-2">Email cannot be changed</p>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              Account Role
            </label>
            <div className="p-4 border border-slate-200 rounded-lg">
              <Badge className={`${getRoleBadgeColor(profile?.role)} border-0 capitalize font-semibold text-sm px-3 py-1.5`}>
                {profile?.role}
              </Badge>
              <p className="text-xs mt-3">
                {profile?.role === 'admin' && 'You have full administrative access to the system'}
                {profile?.role === 'technician' && 'You have technician access with task and maintenance capabilities'}
                {profile?.role === 'user' && 'You have standard user access with device management capabilities'}
              </p>
            </div>
          </div>

          {/* Created Date */}
          <div className="space-y-3">
            <label className="text-sm font-semibold  flex items-center gap-2">
              <Calendar className="h-4 w-4 " />
              Account Created
            </label>
            <div className="p-4  border border-slate-200 rounded-lg">
              <p className=" font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Edit Actions */}
          {editing && (
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={() => {
                  setEditing(false)
                  setFormData({ full_name: profile?.full_name || '' })
                  setError('')
                }}
                variant="outline"
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card className="border border-slate-200/50 shadow-sm">
        <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50/80 to-blue-50/50 px-6 py-5">
          <div>
            <CardTitle className="text-lg font-bold ">Security & Access</CardTitle>
            <CardDescription className="">Manage your account security</CardDescription>
          </div>
        </div>

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold ">Password</label>
            <p className="text-sm mb-3">Change your password to keep your account secure</p>
            <Button variant="outline" className="border-slate-300  hover:bg-slate-50 w-full sm:w-auto">
              Change Password
            </Button>
          </div>

          <div className="h-px bg-slate-200/50"></div>

          <div className="space-y-3">
            <label className="text-sm font-semibold ">Two-Factor Authentication</label>
            <p className=" text-sm mb-3">Add an extra layer of security to your account</p>
            <Button variant="outline" className="border-slate-300  hover:bg-slate-50 w-full sm:w-auto">
              Enable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
