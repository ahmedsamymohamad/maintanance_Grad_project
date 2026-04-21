import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCurrentUser } from '@/lib/auth/session'
import { UserDevicesView } from '@/components/dashboard/user-devices-view'

export default async function MyDevicesPage() {
  const supabase = createServiceRoleClient()
  const user = await requireCurrentUser()

  const { data: devices, error } = await supabase
    .from('devices')
    .select(`
      *,
      ai_predictions (id, predicted_issue, confidence_score, is_acknowledged, created_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load user devices:', error.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Devices</h1>
        <p className="text-muted-foreground">Manage your registered scanners and printers</p>
      </div>
      <UserDevicesView devices={devices || []} />
    </div>
  )
}
