import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface TechnicianDashboardProps {
  technicianId: string
  technicianEmail: string
}

export async function TechnicianDashboard({ technicianId, technicianEmail }: TechnicianDashboardProps) {
  const supabase = createServiceRoleClient()

  const { data: technicianProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', technicianEmail)

  const assigneeIds = [...new Set([technicianId, ...(technicianProfiles || []).map((p: any) => p.id)])]

  const [
    { count: assignedCount },
    { count: inProgressCount },
    { count: completedCount },
    { data: rawTasks }
  ] = await Promise.all([
    supabase.from('tasks').select('*', { count: 'exact', head: true }).in('assigned_to', assigneeIds).eq('status', 'assigned'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).in('assigned_to', assigneeIds).eq('status', 'in_progress'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).in('assigned_to', assigneeIds).eq('status', 'completed'),
    supabase.from('tasks')
      .select('*')
      .in('assigned_to', assigneeIds)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  const taskRequestIds = [...new Set((rawTasks || []).map((t: any) => t.request_id).filter(Boolean))]
  const { data: requestRows } = taskRequestIds.length > 0
    ? await supabase
        .from('maintenance_requests')
        .select('id, device_id, title, priority')
        .in('id', taskRequestIds)
    : { data: [] as any[] }

  const requestMap = new Map((requestRows || []).map((r: any) => [r.id, r]))
  const taskDeviceIds = [
    ...new Set(
      (rawTasks || [])
        .map((t: any) => t.device_id || requestMap.get(t.request_id)?.device_id)
        .filter(Boolean),
    ),
  ]

  const { data: deviceRows } = taskDeviceIds.length > 0
    ? await supabase
        .from('devices')
        .select('id, brand, model, device_type')
        .in('id', taskDeviceIds)
    : { data: [] as any[] }

  const deviceMap = new Map((deviceRows || []).map((d: any) => [d.id, d]))
  const myTasks = (rawTasks || []).map((task: any) => {
    const request = task.request_id ? requestMap.get(task.request_id) : null
    const deviceId = task.device_id || request?.device_id

    return {
      ...task,
      title: task.title || request?.title || 'Maintenance Task',
      priority: task.priority || request?.priority || 'medium',
      devices: deviceId ? (deviceMap.get(deviceId) || null) : null,
    }
  })

  const stats = [
    { label: 'Assigned', value: assignedCount || 0, icon: ClipboardList, color: 'text-blue-600' },
    { label: 'In Progress', value: inProgressCount || 0, icon: Clock, color: 'text-amber-600' },
    { label: 'Completed', value: completedCount || 0, icon: CheckCircle, color: 'text-green-600' },
  ]

  const priorityColors: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
  }

  const statusColors: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Technician Dashboard</h1>
        <p className="text-muted-foreground">Your assigned tasks and work overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Active Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Tasks</CardTitle>
            <CardDescription>Tasks that need your attention</CardDescription>
          </div>
          <Link href="/dashboard/my-tasks">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {myTasks && myTasks.length > 0 ? (
            <div className="space-y-4">
              {myTasks.map((task: any) => (
                <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{task.title}</p>
                      {task.priority === 'critical' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {task.devices?.brand} {task.devices?.model} ({task.devices?.device_type})
                    </p>
                    {task.devices?.location && (
                      <p className="text-sm text-muted-foreground">
                        Location: {task.devices.location}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                    <Badge className={statusColors[task.status]}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
              <p>No active tasks - you&apos;re all caught up!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
