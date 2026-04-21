'use client'

import { useState } from 'react'
import { adminCreateAccount, updateUserRole } from '@/app/auth/actions'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { UserCog, Shield, Wrench, User, UserPlus, AlertCircle } from 'lucide-react'

interface UsersViewProps {
  users: any[]
}

export function UsersView({ users }: UsersViewProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createEmail, setCreateEmail] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<'admin' | 'technician' | 'user'>('technician')
  const router = useRouter()

  const resetCreateForm = () => {
    setCreateError(null)
    setCreateEmail('')
    setCreateFullName('')
    setCreatePassword('')
    setCreateRole('technician')
  }

  const handleCreateAccount = async () => {
    setCreateLoading(true)
    setCreateError(null)

    const result = await adminCreateAccount({
      email: createEmail,
      fullName: createFullName,
      password: createPassword,
      role: createRole,
    })

    if (result?.error) {
      setCreateError(result.error)
      setCreateLoading(false)
      return
    }

    setCreateLoading(false)
    setCreateDialogOpen(false)
    resetCreateForm()
    router.refresh()
  }

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return
    setLoading(true)

    const result = await updateUserRole(selectedUser.id, newRole as 'admin' | 'technician' | 'user')

    if (result?.error) {
      setLoading(false)
      return
    }

    setLoading(false)
    setDialogOpen(false)
    setSelectedUser(null)
    setNewRole('')
    router.refresh()
  }

  const roleConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    admin: { color: 'bg-purple-100 text-purple-800', icon: <Shield className="h-3 w-3" /> },
    technician: { color: 'bg-blue-100 text-blue-800', icon: <Wrench className="h-3 w-3" /> },
    user: { color: 'bg-gray-100 text-gray-800', icon: <User className="h-3 w-3" /> },
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Register Account
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Devices</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={roleConfig[user.role]?.color}>
                    <span className="flex items-center gap-1">
                      {roleConfig[user.role]?.icon}
                      {user.role}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.role === 'user' ? (user.device_count || 0) : '-'}
                </TableCell>
                <TableCell>
                  {user.role === 'technician' ? (user.task_count || 0) : '-'}
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user)
                      setNewRole(user.role)
                      setDialogOpen(true)
                    }}
                  >
                    <UserCog className="h-4 w-4 mr-1" />
                    Edit Role
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Current Role</FieldLabel>
              <Badge className={roleConfig[selectedUser?.role]?.color}>
                {selectedUser?.role}
              </Badge>
            </Field>
            <Field>
              <FieldLabel>New Role</FieldLabel>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Device Owner)</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={!newRole || loading}>
              {loading ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) {
            resetCreateForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Account</DialogTitle>
            <DialogDescription>
              Create user, technician, or admin accounts from the admin portal.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="createFullName">Full Name</FieldLabel>
              <Input
                id="createFullName"
                value={createFullName}
                onChange={(event) => setCreateFullName(event.target.value)}
                placeholder="John Doe"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="createEmail">Email</FieldLabel>
              <Input
                id="createEmail"
                type="email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="user@example.com"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="createPassword">Password</FieldLabel>
              <Input
                id="createPassword"
                type="password"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
                minLength={6}
                placeholder="At least 6 characters"
                required
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select value={createRole} onValueChange={(value) => setCreateRole(value as 'admin' | 'technician' | 'user')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Device Owner)</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          {createError ? (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {createError}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={createLoading || !createEmail || !createPassword}
            >
              {createLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
