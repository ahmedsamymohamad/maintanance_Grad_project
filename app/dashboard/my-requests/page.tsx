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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Maintenance Requests</h1>
        <p className="text-muted-foreground">Submit and track your maintenance requests</p>
      </div>
      <UserRequestsView requests={requests || []} devices={devices || []} />
    </div>
  )
}
