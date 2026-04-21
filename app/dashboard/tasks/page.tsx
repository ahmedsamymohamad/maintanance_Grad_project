import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/session'
import { TasksTable } from '@/components/dashboard/tasks-table'

export default async function TasksPage() {
  const supabase = createServiceRoleClient()
  await requireRole(['admin'])

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: technicians, error: techniciansError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'technician')

  if (tasksError) {
    console.error('Failed to load tasks for admin page:', tasksError.message)
  }

  if (techniciansError) {
    console.error('Failed to load technicians for admin page:', techniciansError.message)
  }

  const taskRequestIds = [...new Set((tasks || []).map((t: any) => t.request_id).filter(Boolean))]
  const { data: requestRows } = taskRequestIds.length > 0
    ? await supabase
        .from('maintenance_requests')
        .select('id, device_id')
        .in('id', taskRequestIds)
    : { data: [] as any[] }

  const requestToDeviceId = new Map((requestRows || []).map((r: any) => [r.id, r.device_id]))

  const taskDeviceIds = [
    ...new Set(
      (tasks || [])
        .map((t: any) => t.device_id || requestToDeviceId.get(t.request_id))
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
  const technicianMap = new Map((technicians || []).map((t) => [t.id, t]))
  const tasksWithProfiles = (tasks || []).map((task: any) => ({
    ...task,
    devices: (() => {
      const deviceId = task.device_id || requestToDeviceId.get(task.request_id)
      return deviceId ? (deviceMap.get(deviceId) || null) : null
    })(),
    profiles: task.assigned_to ? (technicianMap.get(task.assigned_to) || null) : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">Manage and assign maintenance tasks</p>
      </div>
      <TasksTable tasks={tasksWithProfiles} technicians={technicians || []} isAdmin />
    </div>
  )
}
