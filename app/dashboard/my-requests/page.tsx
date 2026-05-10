import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCurrentUser } from '@/lib/auth/session'
import { UserRequestsView } from '@/components/dashboard/user-requests-view'

export default async function MyRequestsPage() {
  const supabase = createServiceRoleClient()
  const user = await requireCurrentUser()

  const { data: requests, error: requestsError } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      devices (brand, model, device_type)
    `)
    .eq('requested_by', user.id)
    .order('created_at', { ascending: false })
    

  const { data: devices, error: devicesError } = await supabase
    .from('devices')
    .select('id, brand, model, device_type')
    .eq('user_id', user.id)
    .neq('status', 'decommissioned')

  const { data: technicianProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'technician')

  if (requestsError) {
    console.error('Failed to load user maintenance requests:', requestsError.message)
  }

  if (devicesError) {
    console.error('Failed to load user devices for requests:', devicesError.message)
  }

  const technicianIds = (technicianProfiles || []).map((technician: any) => technician.id)
  const { data: activeTechnicianSchedules } = technicianIds.length > 0
    ? await supabase
        .from('tasks')
        .select('assigned_to, scheduled_date, scheduled_time, status')
        .in('assigned_to', technicianIds)
        .in('status', ['assigned', 'in_progress', 'on_hold'])
    : { data: [] as any[] }

  const { data: technicianRows } = technicianIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', technicianIds)
    : { data: [] as any[] }

  const technicianMap = new Map((technicianRows || []).map((technician: any) => [technician.id, technician]))
  const requestIds = [...new Set((requests || []).map((request: any) => request.id))]
  const { data: requestTasks } = requestIds.length > 0
    ? await supabase
        .from('tasks')
        .select('request_id, assigned_to, status')
        .in('request_id', requestIds)
        .in('status', ['assigned', 'in_progress', 'on_hold', 'completed'])
    : { data: [] as any[] }

  const requestTaskMap = new Map((requestTasks || []).map((task: any) => [task.request_id, task]))
  const requestsWithAssignee = (requests || []).map((request: any) => {
    const task = requestTaskMap.get(request.id)
    return {
      ...request,
      assigned_technician: task?.assigned_to ? (technicianMap.get(task.assigned_to) || null) : null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Maintenance Requests</h1>
        <p className="text-muted-foreground">Submit and track your maintenance requests</p>
      </div>
      <UserRequestsView
        requests={requestsWithAssignee}
        devices={devices || []}
        technicianIds={technicianIds}
        technicianSchedules={(activeTechnicianSchedules || []) as any[]}
      />
    </div>
  )
}
