import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/session'
import { TechnicianTasksView } from '@/components/dashboard/technician-tasks-view'

export default async function MyTasksPage() {
  const supabase = createServiceRoleClient()
  const user = await requireRole(['technician'])

  const { data: technicianProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', user.email)

  const assigneeIds = [...new Set([user.id, ...(technicianProfiles || []).map((p: any) => p.id)])]

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('assigned_to', assigneeIds)
    .order('created_at', { ascending: false })

  if (tasksError) {
    console.error('Failed to load technician tasks:', tasksError.message)
  }

  const taskRequestIds = [...new Set((tasks || []).map((t: any) => t.request_id).filter(Boolean))]
  const { data: requestRows } = taskRequestIds.length > 0
    ? await supabase
        .from('maintenance_requests')
        .select('id, device_id, title, description, priority')
        .in('id', taskRequestIds)
    : { data: [] as any[] }

  const requestMap = new Map((requestRows || []).map((r: any) => [r.id, r]))
  const taskDeviceIds = [
    ...new Set(
      (tasks || [])
        .map((t: any) => t.device_id || requestMap.get(t.request_id)?.device_id)
        .filter(Boolean),
    ),
  ]

  const { data: deviceRows } = taskDeviceIds.length > 0
    ? await supabase
        .from('devices')
        .select('id, brand, model, device_type, serial_number')
        .in('id', taskDeviceIds)
    : { data: [] as any[] }

  const deviceMap = new Map((deviceRows || []).map((d: any) => [d.id, d]))
  const taskIds = (tasks || []).map((t: any) => t.id)

  const { data: reportRows } = taskIds.length > 0
    ? await supabase
        .from('task_reports')
        .select('*')
        .in('task_id', taskIds)
    : { data: [] as any[] }

  const reportsByTaskId = new Map<string, any[]>()
  for (const report of reportRows || []) {
    const existing = reportsByTaskId.get(report.task_id) || []
    existing.push(report)
    reportsByTaskId.set(report.task_id, existing)
  }

  const hydratedTasks = (tasks || []).map((task: any) => {
    const request = task.request_id ? requestMap.get(task.request_id) : null
    const deviceId = task.device_id || request?.device_id

    return {
      ...task,
      title: task.title || request?.title || 'Maintenance Task',
      description: task.description || request?.description || task.notes || null,
      priority: task.priority || request?.priority || 'medium',
      devices: deviceId ? (deviceMap.get(deviceId) || null) : null,
      task_reports: reportsByTaskId.get(task.id) || [],
    }
  })

  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('*')
    .gt('quantity', 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">View and manage your assigned maintenance tasks</p>
      </div>
      <TechnicianTasksView tasks={hydratedTasks} inventory={inventory || []} technicianId={assigneeIds[0]} />
    </div>
  )
}
