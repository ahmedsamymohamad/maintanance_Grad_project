import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/session'
import { UsersView } from '@/components/dashboard/users-view'

export default async function UsersPage() {
  const supabase = createAdminClient()
  await requireRole(['admin'])

  const { data: users } = await supabase
    .from('app_users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  const usersWithCounts = await Promise.all(
    (users || []).map(async (user) => {
      let deviceCount = 0
      let taskCount = 0

      if (user.role === 'user') {
        const { count } = await supabase
          .from('devices')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)

        deviceCount = count ?? 0
      }

      if (user.role === 'technician') {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', user.id)

        taskCount = count ?? 0
      }

      return {
        ...user,
        device_count: deviceCount,
        task_count: taskCount,
      }
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage system users and their roles</p>
      </div>
      <UsersView users={usersWithCounts} />
    </div>
  )
}
