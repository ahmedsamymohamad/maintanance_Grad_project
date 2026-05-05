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

  if (requestsError) {
    console.error('Failed to load user maintenance requests:', requestsError.message)
  }

  if (devicesError) {
    console.error('Failed to load user devices for requests:', devicesError.message)
  }

  const requestIds = [...new Set((requests || []).map((request: any) => request.id))]
  const { data: taskRows } = requestIds.length > 0
    ? await supabase
        .from('tasks')
        .select('request_id, assigned_to, status')
        .in('request_id', requestIds)
        .in('status', ['assigned', 'in_progress', 'on_hold', 'completed'])
    : { data: [] as any[] }

  const assigneeIds = [...new Set((taskRows || []).map((task: any) => task.assigned_to).filter(Boolean))]
  const { data: technicianRows } = assigneeIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', assigneeIds)
    : { data: [] as any[] }

  const technicianMap = new Map((technicianRows || []).map((technician: any) => [technician.id, technician]))
  const taskMap = new Map((taskRows || []).map((task: any) => [task.request_id, task]))
  const requestsWithAssignee = (requests || []).map((request: any) => {
    const task = taskMap.get(request.id)
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
      <UserRequestsView requests={requestsWithAssignee} devices={devices || []} />
    </div>
  )
}
