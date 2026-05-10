import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import {
  ACTIVE_TASK_STATUSES,
  getAvailableTechnicianIds,
  type TechnicianScheduleEntry,
} from '@/lib/maintenance/scheduling'

export const runtime = 'nodejs'

function isValidTime(value: unknown) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    if (!payload?.device_id || !payload?.title || !payload?.description) {
      return Response.json({ error: 'device_id, title, and description are required.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, user_id, status')
      .eq('id', payload.device_id)
      .single()

    if (deviceError) {
      return Response.json({ error: deviceError.message }, { status: 500 })
    }

    if (!device || device.user_id !== user.id) {
      return Response.json({ error: 'Device not found for current user.' }, { status: 404 })
    }

    const rawPriority = typeof payload.priority === 'string' ? payload.priority : 'medium'
    const normalizedPriority = rawPriority === 'critical' ? 'urgent' : rawPriority
    const allowedPriorities = new Set(['low', 'medium', 'high', 'urgent'])
    const priority = allowedPriorities.has(normalizedPriority) ? normalizedPriority : 'medium'

    let scheduledDate: string | null = null
    if (payload.scheduled_date && typeof payload.scheduled_date === 'string') {
      const parsed = new Date(payload.scheduled_date + 'T00:00:00')
      if (!isNaN(parsed.getTime())) {
        scheduledDate = payload.scheduled_date.slice(0, 10)
      }
    }

    const scheduledTime = isValidTime(payload.scheduled_time) ? payload.scheduled_time : null
    if ((scheduledTime && !scheduledDate) || (scheduledDate && payload.scheduled_time && !scheduledTime)) {
      return Response.json({ error: 'scheduled_time requires a valid scheduled_date.' }, { status: 400 })
    }

    if (scheduledDate) {
      const { data: technicianProfiles, error: technicianProfilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'technician')

      if (technicianProfilesError) {
        return Response.json({ error: technicianProfilesError.message }, { status: 500 })
      }

      const technicianIds = (technicianProfiles || []).map((technician: any) => technician.id)

      if (technicianIds.length === 0) {
        return Response.json(
          { error: 'No technicians are available to take maintenance requests right now.' },
          { status: 409 },
        )
      }

      const { data: technicianSchedules, error: technicianSchedulesError } = await supabase
        .from('tasks')
        .select('assigned_to, scheduled_date, scheduled_time')
        .in('assigned_to', technicianIds)
        .in('status', [...ACTIVE_TASK_STATUSES])

      if (technicianSchedulesError) {
        return Response.json({ error: technicianSchedulesError.message }, { status: 500 })
      }

      const availableTechnicians = getAvailableTechnicianIds(
        technicianIds,
        (technicianSchedules || []) as TechnicianScheduleEntry[],
        scheduledDate,
        scheduledTime,
      )

      if (availableTechnicians.length === 0) {
        return Response.json(
          {
            error:
              'No technician is available for the selected date and time. Please choose another slot.',
          },
          { status: 409 },
        )
      }
    }

    const { data: insertedRequest, error: requestError } = await supabase
      .from('maintenance_requests')
      .insert({
        device_id: payload.device_id,
        requested_by: user.id,
        title: String(payload.title).trim(),
        description: String(payload.description).trim(),
        priority,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: 'pending',
      })
      .select('*')
      .single()

    if (requestError) {
      return Response.json({ error: requestError.message }, { status: 500 })
    }

    if (device.status !== 'decommissioned') {
      const { error: updateError } = await supabase
        .from('devices')
        .update({ status: 'needs_maintenance' })
        .eq('id', payload.device_id)

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 })
      }
    }

    return Response.json({ request: insertedRequest })
  } catch (error) {
    console.error('Create maintenance request error:', error)
    return Response.json({ error: 'Failed to submit maintenance request.' }, { status: 500 })
  }
}
