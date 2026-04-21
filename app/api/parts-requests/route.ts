import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'technician' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json()

    if (!payload?.task_id || !payload?.inventory_item_id || !payload?.quantity_requested) {
      return Response.json({ error: 'task_id, inventory_item_id, and quantity_requested are required.' }, { status: 400 })
    }

    const quantityRequested = Number(payload.quantity_requested)
    if (!Number.isFinite(quantityRequested) || quantityRequested <= 0) {
      return Response.json({ error: 'quantity_requested must be a positive number.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 })
    }

    const profileIds = [...new Set([user.id, ...(profileRows || []).map((p: any) => p.id)])]

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to')
      .eq('id', payload.task_id)
      .single()

    if (taskError) {
      return Response.json({ error: taskError.message }, { status: 500 })
    }

    if (!task) {
      return Response.json({ error: 'Task not found.' }, { status: 404 })
    }

    if (user.role !== 'admin' && !profileIds.includes(task.assigned_to)) {
      return Response.json({ error: 'You can only request parts for your assigned tasks.' }, { status: 403 })
    }

    const requestedBy = (profileRows && profileRows.length > 0 ? profileRows[0].id : user.id)

    const { data: inserted, error: insertError } = await supabase
      .from('parts_requests')
      .insert({
        task_id: payload.task_id,
        requested_by: requestedBy,
        inventory_item_id: payload.inventory_item_id,
        quantity_requested: Math.floor(quantityRequested),
        status: 'pending',
        notes: payload.notes || null,
      })
      .select('*')
      .single()

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({ request: inserted })
  } catch (error) {
    console.error('Create parts request error:', error)
    return Response.json({ error: 'Failed to create parts request.' }, { status: 500 })
  }
}
