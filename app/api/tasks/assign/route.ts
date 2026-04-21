import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

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
      .select('id, device_id, title, description, priority, status')
      .eq('id', requestId)
      .single()

    if (requestFetchError) {
      return Response.json({ error: requestFetchError.message }, { status: 500 })
    }

    if (!maintenanceRequest) {
      return Response.json({ error: 'Maintenance request not found.' }, { status: 404 })
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
      title: maintenanceRequest.title,
      description: taskDescription || maintenanceRequest.description || null,
      notes: taskDescription || maintenanceRequest.description || null,
      priority: maintenanceRequest.priority,
      status: 'assigned',
    }

    let insertAttempt = await supabase.from('tasks').insert(taskRow).select('*').single()

    if (insertAttempt.error) {
      insertAttempt = await supabase
        .from('tasks')
        .insert({
          request_id: maintenanceRequest.id,
          assigned_to: technicianId,
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
