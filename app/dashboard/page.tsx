import { createClient } from '@/lib/supabase/server'
import { requireCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { TechnicianDashboard } from '@/components/dashboard/technician-dashboard'
import { UserDashboard } from '@/components/dashboard/user-dashboard'
import { PremiumUserDashboard } from '@/components/dashboard/premium-user-dashboard'

export default async function DashboardPage() {
  try {
    const supabase = await createClient()
    const user = await requireCurrentUser()

    console.log('[DashboardPage] User authenticated:', { userId: user.id, role: user.role })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[DashboardPage] Profile fetch error:', profileError)
    }

    if (!profile) {
      console.error('[DashboardPage] No profile found for user:', user.id)
      redirect('/auth/login')
    }

    console.log('[DashboardPage] Profile loaded, routing to dashboard:', { role: profile.role })

    if (profile.role === 'admin') {
      console.log('[DashboardPage] Rendering AdminDashboard')
      return <AdminDashboard />
    }

    if (profile.role === 'technician') {
      console.log('[DashboardPage] Rendering TechnicianDashboard')
      return <TechnicianDashboard technicianId={user.id} technicianEmail={user.email} />
    }

    if (profile.role === 'premium_user') {
      console.log('[DashboardPage] Rendering PremiumUserDashboard')
      return <PremiumUserDashboard userId={user.id} />
    }

    console.log('[DashboardPage] Rendering UserDashboard')
    return <UserDashboard userId={user.id} />
  } catch (error) {
    console.error('[DashboardPage] Unexpected error:', error)
    redirect('/auth/login')
  }
}
