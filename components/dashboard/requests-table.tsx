'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { CheckCircle, XCircle, Eye, UserPlus, CalendarDays } from 'lucide-react'

interface RequestsTableProps {
  requests: any[]
  technicians: any[]
}

export function RequestsTable({ requests, technicians }: RequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTechnician, setSelectedTechnician] = useState<string>('')
  const [taskDescription, setTaskDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleApprove = async (request: any) => {
    setSelectedRequest(request)
    setTaskDescription(request.description || '')
    setAssignDialogOpen(true)
  }

  const handleReject = async (requestId: string) => {
    setLoading(true)
    await supabase
      .from('maintenance_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', requestId)
    setLoading(false)
    router.refresh()
  }

  const handleAssignTask = async () => {
    if (!selectedRequest || !selectedTechnician) return
    setLoading(true)
    setErrorMessage(null)

    const response = await fetch('/api/tasks/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: selectedRequest.id,
        technician_id: selectedTechnician,
        task_description: taskDescription,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setLoading(false)
      setErrorMessage(payload?.error || 'Failed to assign task')
      return
    }

    setLoading(false)
    setAssignDialogOpen(false)
    setSelectedTechnician('')
    setTaskDescription('')
    router.refresh()
  }

  const priorityColors: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
  }

  const statusColors: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    pending: 'secondary',
    approved: 'outline',
    rejected: 'destructive',
  }

  return (
    <>
      {errorMessage && (
        <div className="mb-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Booked Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No maintenance requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {request.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{request.devices?.brand} {request.devices?.model}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {request.devices?.device_type}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{request.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.assigned_technician?.full_name ? (
                      <div>
                        <p>{request.assigned_technician.full_name}</p>
                        <p className="text-sm text-muted-foreground">{request.assigned_technician.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not assigned yet</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityColors[request.priority]}>
                      {request.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {request.scheduled_date ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {new Date(request.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedRequest(request)
                          setDialogOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(request)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleReject(request.id)}
                            disabled={loading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>Request Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p>{selectedRequest?.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Device</p>
                <p>{selectedRequest?.devices?.brand} {selectedRequest?.devices?.model}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                <p>{selectedRequest?.devices?.serial_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                <p>{selectedRequest?.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Technician</p>
                <p>{selectedRequest?.assigned_technician?.full_name || 'Not assigned yet'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                <Badge variant={priorityColors[selectedRequest?.priority]}>
                  {selectedRequest?.priority}
                </Badge>
              </div>
              {selectedRequest?.scheduled_date && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Preferred Maintenance Date</p>
                  <p className="flex items-center gap-1.5 text-blue-600 font-semibold mt-0.5">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(selectedRequest.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Technician Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Technician
            </DialogTitle>
            <DialogDescription>
              Approve this request and assign a technician to handle it
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Select Technician</FieldLabel>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Task Description</FieldLabel>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Additional instructions for the technician..."
                rows={4}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTask} disabled={!selectedTechnician || loading}>
              {loading ? 'Assigning...' : 'Assign & Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
