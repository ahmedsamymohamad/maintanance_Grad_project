import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const payload = await request.json()
    const requestedStatus = payload?.status as string | undefined

    if (!requestedStatus || !['in_progress', 'completed'].includes(requestedStatus)) {
      return Response.json({ error: 'status must be in_progress or completed.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: technicianProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)

    const assigneeIds = [...new Set([user.id, ...(technicianProfiles || []).map((p: any) => p.id)])]

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to, status')
      .eq('id', id)
      .single()

    if (taskError) {
      return Response.json({ error: taskError.message }, { status: 500 })
    }

    if (!task) {
      return Response.json({ error: 'Task not found.' }, { status: 404 })
    }

    if (user.role !== 'admin' && !assigneeIds.includes(task.assigned_to)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates: Record<string, string> = { status: requestedStatus }
    if (requestedStatus === 'in_progress') {
      updates.started_at = new Date().toISOString()
    }
    if (requestedStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json({ task: updatedTask })
  } catch (error) {
    console.error('Update task status error:', error)
    return Response.json({ error: 'Failed to update task status.' }, { status: 500 })
  }
}
