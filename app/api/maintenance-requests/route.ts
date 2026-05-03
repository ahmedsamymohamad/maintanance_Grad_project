import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

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

    // Validate scheduled_date if provided
    let scheduledDate: string | null = null
    if (payload.scheduled_date && typeof payload.scheduled_date === 'string') {
      const parsed = new Date(payload.scheduled_date + 'T00:00:00')
      if (!isNaN(parsed.getTime())) {
        scheduledDate = payload.scheduled_date.slice(0, 10) // YYYY-MM-DD
      }
    }

    if (scheduledDate) {
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('scheduled_date', scheduledDate)
        .neq('status', 'cancelled')
        .maybeSingle()

      if (existingRequestError) {
        return Response.json({ error: existingRequestError.message }, { status: 500 })
      }

      if (existingRequest) {
        return Response.json(
          { error: 'That date is already booked. Please choose another date.' },
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
