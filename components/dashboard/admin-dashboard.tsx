import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Package, 
  Users,
  Brain,
  ClipboardList
} from 'lucide-react'

export async function AdminDashboard() {
  const supabase = createServiceRoleClient()

  // Fetch stats
  const [
    { count: totalDevices },
    { count: pendingRequests },
    { count: activeTasks },
    { count: totalTechnicians },
    { count: pendingPredictions },
    { data: inventoryItems },
    { data: recentPredictions },
    { data: recentRequests },
    { data: pendingPartRequests }
  ] = await Promise.all([
    supabase.from('devices').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['assigned', 'in_progress']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'technician'),
    supabase.from('ai_predictions').select('*', { count: 'exact', head: true }).eq('is_acknowledged', false),
    supabase.from('inventory_items').select('id, name, description, quantity, min_quantity').limit(200),
    supabase.from('ai_predictions').select('*, devices(brand, model, device_type)').order('created_at', { ascending: false }).limit(5),
    supabase.from('maintenance_requests').select('*, devices(brand, model), profiles!maintenance_requests_requested_by_fkey(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
    supabase.from('parts_requests').select('id, inventory_item_id, requested_by, task_id, quantity_requested, notes, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
  ])

  const lowStockItems = (inventoryItems || [])
    .filter((item: any) => Number(item.quantity) <= Number(item.min_quantity || 0))
    .sort((a: any, b: any) => Number(a.quantity) - Number(b.quantity))
    .slice(0, 5)

  const inventoryItemIds = [...new Set((pendingPartRequests || []).map((r: any) => r.inventory_item_id).filter(Boolean))]
  const requestedByIds = [...new Set((pendingPartRequests || []).map((r: any) => r.requested_by).filter(Boolean))]

  const [{ data: requestedItems }, { data: requesterProfiles }] = await Promise.all([
    inventoryItemIds.length > 0
      ? supabase.from('inventory_items').select('id, name, description').in('id', inventoryItemIds)
      : Promise.resolve({ data: [] as any[] }),
    requestedByIds.length > 0
      ? supabase.from('profiles').select('id, full_name').in('id', requestedByIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const itemMap = new Map((requestedItems || []).map((item: any) => [item.id, item]))
  const requesterMap = new Map((requesterProfiles || []).map((profile: any) => [profile.id, profile]))
  const recentPartRequests = (pendingPartRequests || []).map((request: any) => ({
    ...request,
    inventory_item: request.inventory_item_id ? (itemMap.get(request.inventory_item_id) || null) : null,
    requester: request.requested_by ? (requesterMap.get(request.requested_by) || null) : null,
  }))

  const stats = [
    { label: 'Total Devices', value: totalDevices || 0, icon: Cpu, color: 'text-blue-600' },
    { label: 'Pending Requests', value: pendingRequests || 0, icon: ClipboardList, color: 'text-amber-600' },
    { label: 'Active Tasks', value: activeTasks || 0, icon: Clock, color: 'text-green-600' },
    { label: 'Technicians', value: totalTechnicians || 0, icon: Users, color: 'text-purple-600' },
    { label: 'AI Alerts', value: pendingPredictions || 0, icon: Brain, color: 'text-red-600' },
    { label: 'Low Stock Items', value: lowStockItems?.length || 0, icon: Package, color: 'text-orange-600' },
    { label: 'Part Requests', value: recentPartRequests?.length || 0, icon: AlertTriangle, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your maintenance system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent AI Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Recent AI Predictions
            </CardTitle>
            <CardDescription>AI-detected potential issues</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPredictions && recentPredictions.length > 0 ? (
              <div className="space-y-4">
                {recentPredictions.map((prediction: any) => (
                  <div key={prediction.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {prediction.devices?.brand} {prediction.devices?.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {prediction.predicted_issue}
                      </p>
                    </div>
                    <Badge variant={(prediction.confidence_score || 0) > 0.7 ? 'destructive' : 'secondary'}>
                      {Math.round((prediction.confidence_score || 0) * 100)}% risk
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No predictions yet</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Pending Requests
            </CardTitle>
            <CardDescription>User maintenance requests awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests && recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((request: any) => (
                  <div key={request.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.devices?.brand} {request.devices?.model} - {request.profiles?.full_name}
                      </p>
                    </div>
                    <Badge variant={
                      request.priority === 'critical' ? 'destructive' :
                      request.priority === 'high' ? 'destructive' :
                      request.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {request.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending requests</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Inventory items below minimum quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems && lowStockItems.length > 0 ? (
              <div className="space-y-4">
                {lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-destructive">{item.quantity} left</p>
                      <p className="text-sm text-muted-foreground">Min: {item.min_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>All items adequately stocked</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Part Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Pending Part Requests
            </CardTitle>
            <CardDescription>Requested spare parts awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPartRequests.length > 0 ? (
              <div className="space-y-4">
                {recentPartRequests.map((request: any) => (
                  <div key={request.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{request.inventory_item?.name || 'Inventory item'}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {request.quantity_requested} - {request.requester?.full_name || 'Technician'}
                      </p>
                    </div>
                    <Badge variant="secondary">pending</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending part requests</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
