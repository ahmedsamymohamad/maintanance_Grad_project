import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCurrentUser } from '@/lib/auth/session'
import { MaintenanceCalendarView } from '@/components/dashboard/maintenance-calendar-view'
import { CalendarCheck } from 'lucide-react'

export default async function MaintenanceCalendarPage() {
  const user = await requireCurrentUser()
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('maintenance_requests')
    .select(`
      id,
      title,
      scheduled_date,
      status,
      priority,
      devices (brand, model, device_type),
      profiles!maintenance_requests_requested_by_fkey (full_name, email)
    `)
    .not('scheduled_date', 'is', null)
    .order('scheduled_date', { ascending: true })

  if (user.role === 'user' || user.role === 'premium_user') {
    query = query.eq('requested_by', user.id)
  }

  const { data: bookings, error } = await query

  if (error) {
    console.error('Maintenance calendar load error:', error.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarCheck className="h-8 w-8 text-blue-600" />
          Maintenance Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          {user.role === 'admin' || user.role === 'technician'
            ? 'All scheduled maintenance bookings across the organization.'
            : 'Your scheduled maintenance bookings.'}
        </p>
      </div>
      <MaintenanceCalendarView bookings={bookings || []} />
    </div>
  )
}
