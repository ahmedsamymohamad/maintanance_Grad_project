import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/session'
import { InventoryView } from '@/components/dashboard/inventory-view'

export default async function InventoryPage() {
  await requireRole(['admin'])
  const supabase = createAdminClient()

  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name')

  const { data: partRequestsRaw } = await supabase
    .from('parts_requests')
    .select('*')
    .in('status', ['pending'])
    .order('created_at', { ascending: false })

  const itemIds = [...new Set((partRequestsRaw || []).map((r: any) => r.inventory_item_id).filter(Boolean))]
  const requestedByIds = [...new Set((partRequestsRaw || []).map((r: any) => r.requested_by).filter(Boolean))]
  const taskIds = [...new Set((partRequestsRaw || []).map((r: any) => r.task_id).filter(Boolean))]

  const [{ data: items }, { data: requesters }, { data: tasks }] = await Promise.all([
    itemIds.length > 0
      ? supabase.from('inventory_items').select('id, name, description').in('id', itemIds)
      : Promise.resolve({ data: [] as any[] }),
    requestedByIds.length > 0
      ? supabase.from('profiles').select('id, full_name').in('id', requestedByIds)
      : Promise.resolve({ data: [] as any[] }),
    taskIds.length > 0
      ? supabase.from('tasks').select('id, notes, request_id').in('id', taskIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const requestIds = [...new Set((tasks || []).map((t: any) => t.request_id).filter(Boolean))]
  const { data: maintenanceRequests } = requestIds.length > 0
    ? await supabase.from('maintenance_requests').select('id, title, device_id').in('id', requestIds)
    : { data: [] as any[] }

  const deviceIds = [...new Set((maintenanceRequests || []).map((r: any) => r.device_id).filter(Boolean))]
  const { data: devices } = deviceIds.length > 0
    ? await supabase.from('devices').select('id, brand, model').in('id', deviceIds)
    : { data: [] as any[] }

  const itemMap = new Map((items || []).map((i: any) => [i.id, i]))
  const requesterMap = new Map((requesters || []).map((p: any) => [p.id, p]))
  const taskMap = new Map((tasks || []).map((t: any) => [t.id, t]))
  const requestMap = new Map((maintenanceRequests || []).map((r: any) => [r.id, r]))
  const deviceMap = new Map((devices || []).map((d: any) => [d.id, d]))

  const partRequests = (partRequestsRaw || []).map((r: any) => {
    const task = r.task_id ? taskMap.get(r.task_id) : null
    const maintenanceRequest = task?.request_id ? requestMap.get(task.request_id) : null
    const device = maintenanceRequest?.device_id ? deviceMap.get(maintenanceRequest.device_id) : null

    return {
      ...r,
      inventory_items: r.inventory_item_id ? (itemMap.get(r.inventory_item_id) || null) : null,
      profiles: r.requested_by ? (requesterMap.get(r.requested_by) || null) : null,
      tasks: {
        title: maintenanceRequest?.title || task?.notes || 'Maintenance task',
        devices: device || null,
      },
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">Manage parts and supplies inventory</p>
      </div>
      <InventoryView inventory={inventory || []} partRequests={partRequests || []} />
    </div>
  )
}
