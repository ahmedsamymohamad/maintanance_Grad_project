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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maintenance Requests</h1>
        <p className="text-muted-foreground">Review and manage user maintenance requests</p>
      </div>
      <RequestsTable requests={requests || []} technicians={technicians || []} />
    </div>
  )
}
