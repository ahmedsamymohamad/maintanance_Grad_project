import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/session'
import { RequestsTable } from '@/components/dashboard/requests-table'

export default async function RequestsPage() {
  const supabase = createServiceRoleClient()
  await requireRole(['admin'])

  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      devices (id, brand, model, device_type, serial_number),
      profiles!maintenance_requests_requested_by_fkey (id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  const { data: technicians } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'technician')

  const requestIds = [...new Set((requests || []).map((request: any) => request.id))]
  const { data: taskRows } = requestIds.length > 0
    ? await supabase
        .from('tasks')
        .select('request_id, assigned_to, status')
        .in('request_id', requestIds)
        .in('status', ['assigned', 'in_progress', 'on_hold', 'completed'])
    : { data: [] as any[] }

  const technicianIds = [...new Set((taskRows || []).map((task: any) => task.assigned_to).filter(Boolean))]
  const { data: technicianRows } = technicianIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', technicianIds)
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
        <h1 className="text-3xl font-bold tracking-tight">Maintenance Requests</h1>
        <p className="text-muted-foreground">Review and manage user maintenance requests</p>
      </div>
      <RequestsTable requests={requestsWithAssignee} technicians={technicians || []} />
    </div>
  )
}
