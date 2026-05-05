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
      scheduled_time,
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

  const normalizedBookings = (bookings || []).map((booking) => ({
    ...booking,
    devices: Array.isArray(booking.devices) ? booking.devices[0] : booking.devices,
    profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
  }))

  // Load assigned technician for each booking (if any) so admin calendar can show assignee name
  const bookingIds = (normalizedBookings || []).map((b: any) => b.id)
  let assignedMap = new Map<string, any>()
  if (bookingIds.length > 0) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, request_id, assigned_to')
      .in('request_id', bookingIds)

    const techIds = [...new Set((taskRows || []).map((t: any) => t.assigned_to).filter(Boolean))]
    const { data: techProfiles } = techIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', techIds)
      : { data: [] as any[] }

    const techMap = new Map((techProfiles || []).map((p: any) => [p.id, p]))
    for (const t of (taskRows || [])) {
      if (t.assigned_to) {
        assignedMap.set(t.request_id, techMap.get(t.assigned_to) || null)
      }
    }
  }

  const bookingsWithAssignee = normalizedBookings.map((b: any) => ({
    ...b,
    assignee: assignedMap.get(b.id) || null,
  }))

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
      <MaintenanceCalendarView bookings={bookingsWithAssignee} />
    </div>
  )
}
