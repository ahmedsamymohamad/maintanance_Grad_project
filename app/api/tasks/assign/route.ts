import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

const TECHNICIAN_BLOCK_WINDOW_MINUTES = 5 * 60

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json()
    const requestId = payload?.request_id as string | undefined
    const technicianId = payload?.technician_id as string | undefined
    const taskDescription = payload?.task_description as string | undefined

    if (!requestId || !technicianId) {
      return Response.json({ error: 'request_id and technician_id are required.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: maintenanceRequest, error: requestFetchError } = await supabase
      .from('maintenance_requests')
      .select('id, device_id, title, description, priority, status, scheduled_date, scheduled_time')
      .eq('id', requestId)
      .single()

    if (requestFetchError) {
      return Response.json({ error: requestFetchError.message }, { status: 500 })
    }

    if (!maintenanceRequest) {
      return Response.json({ error: 'Maintenance request not found.' }, { status: 404 })
    }

    if (maintenanceRequest.scheduled_date) {
      const { data: technicianTasks, error: technicianTasksError } = await supabase
        .from('tasks')
        .select('id, request_id, status')
        .eq('assigned_to', technicianId)
        .in('status', ['assigned', 'in_progress', 'on_hold'])

      if (technicianTasksError) {
        return Response.json({ error: technicianTasksError.message }, { status: 500 })
      }

      const assignedRequestIds = (technicianTasks || [])
        .map((task) => task.request_id)
        .filter((id): id is string => Boolean(id))

      if (assignedRequestIds.length > 0) {
        const { data: assignedRequests, error: assignedRequestsError } = await supabase
          .from('maintenance_requests')
          .select('id, scheduled_date, scheduled_time, status')
          .in('id', assignedRequestIds)
          .eq('scheduled_date', maintenanceRequest.scheduled_date)
          .neq('status', 'cancelled')

        if (assignedRequestsError) {
          return Response.json({ error: assignedRequestsError.message }, { status: 500 })
        }

        const targetTime = maintenanceRequest.scheduled_time
        for (const assigned of assignedRequests || []) {
          if (assigned.id === maintenanceRequest.id) {
            continue
          }

          const existingTime = assigned.scheduled_time

          if (!targetTime || !existingTime) {
            return Response.json(
              {
                error:
                  'This technician already has a booking on this date. Please pick another technician or choose a different time.',
              },
              { status: 409 },
            )
          }

          const diffMinutes = Math.abs(timeToMinutes(existingTime) - timeToMinutes(targetTime))
          if (diffMinutes < TECHNICIAN_BLOCK_WINDOW_MINUTES) {
            return Response.json(
              {
                error:
                  'This technician has another booking within 5 hours of this time. Please assign a different technician or reschedule.',
              },
              { status: 409 },
            )
          }
        }
      }
    }

    // Keep request status in sync, but tolerate schema enum differences.
    let requestUpdated = false
    for (const nextStatus of ['approved', 'assigned']) {
      const { error: requestUpdateError } = await supabase
        .from('maintenance_requests')
        .update({ status: nextStatus })
        .eq('id', requestId)

      if (!requestUpdateError) {
        requestUpdated = true
        break
      }
    }

    const taskRow = {
      request_id: maintenanceRequest.id,
      device_id: maintenanceRequest.device_id,
      assigned_to: technicianId,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      title: maintenanceRequest.title,
      description: taskDescription || maintenanceRequest.description || null,
      notes: taskDescription || maintenanceRequest.description || null,
      priority: maintenanceRequest.priority,
      scheduled_date: maintenanceRequest.scheduled_date,
      scheduled_time: maintenanceRequest.scheduled_time,
      status: 'assigned',
    }

    let insertAttempt = await supabase.from('tasks').insert(taskRow).select('*').single()

    if (insertAttempt.error) {
      insertAttempt = await supabase
        .from('tasks')
        .insert({
          request_id: maintenanceRequest.id,
          assigned_to: technicianId,
          assigned_at: new Date().toISOString(),
          scheduled_date: maintenanceRequest.scheduled_date,
          scheduled_time: maintenanceRequest.scheduled_time,
          notes: taskDescription || maintenanceRequest.description || null,
          status: 'assigned',
        })
        .select('*')
        .single()
    }

    if (insertAttempt.error) {
      insertAttempt = await supabase
        .from('tasks')
        .insert({
          request_id: maintenanceRequest.id,
          assigned_to: technicianId,
          assigned_at: new Date().toISOString(),
          scheduled_date: maintenanceRequest.scheduled_date,
          scheduled_time: maintenanceRequest.scheduled_time,
          status: 'assigned',
        })
        .select('*')
        .single()
    }

    if (insertAttempt.error) {
      return Response.json({ error: insertAttempt.error.message }, { status: 500 })
    }

    return Response.json({
      task: insertAttempt.data,
      requestUpdated,
    })
  } catch (error) {
    console.error('Assign task error:', error)
    return Response.json({ error: 'Failed to assign task.' }, { status: 500 })
  }
}
