'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Plus, ClipboardList, Clock, CheckCircle, XCircle, CalendarDays, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAvailableTechnicianIds, type TechnicianScheduleEntry } from '@/lib/maintenance/scheduling'

interface UserRequestsViewProps {
  requests: any[]
  devices: any[]
  technicianIds: string[]
  technicianSchedules: TechnicianScheduleEntry[]
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function UserRequestsView({
  requests,
  devices,
  technicianIds,
  technicianSchedules,
}: UserRequestsViewProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined)
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [calOpen, setCalOpen] = useState(false)

  const router = useRouter()

  const selectedSlotAvailable = useMemo(() => {
    if (!scheduledDate) {
      return true
    }

    return getAvailableTechnicianIds(
      technicianIds,
      technicianSchedules,
      toLocalDateStr(scheduledDate),
      scheduledTime,
    ).length > 0
  }, [scheduledDate, scheduledTime, technicianIds, technicianSchedules])

  const isDateBlockedForCurrentTime = (date: Date) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    if (date < todayStart) {
      return true
    }

    return (
      getAvailableTechnicianIds(
        technicianIds,
        technicianSchedules,
        toLocalDateStr(date),
        scheduledTime,
      ).length === 0
    )
  }

  const handleSubmitRequest = async () => {
    if (!selectedDevice || !title || !description) return

    if (scheduledDate && !selectedSlotAvailable) {
      setErrorMessage('No technician is available for the selected date and time.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const response = await fetch('/api/maintenance-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: selectedDevice,
        title,
        description,
        priority,
        scheduled_date: scheduledDate ? toLocalDateStr(scheduledDate) : null,
        scheduled_time: scheduledDate ? scheduledTime : null,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setLoading(false)
      setErrorMessage(payload?.error || 'Failed to submit maintenance request')
      return
    }

    setLoading(false)
    setAddDialogOpen(false)
    resetForm()
    router.refresh()
  }

  const resetForm = () => {
    setSelectedDevice('')
    setTitle('')
    setDescription('')
    setPriority('medium')
    setScheduledDate(undefined)
    setScheduledTime('09:00')
  }

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-4 w-4" /> },
    approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
    rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
  }

  const priorityColors: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setAddDialogOpen(true)} disabled={devices.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {errorMessage && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <CardDescription>
                      {request.devices?.brand} {request.devices?.model} ({request.devices?.device_type})
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={priorityColors[request.priority]}>{request.priority}</Badge>
                    {statusConfig[request.status] && (
                      <Badge className={statusConfig[request.status].color}>
                        <span className="flex items-center gap-1">
                          {statusConfig[request.status].icon}
                          {request.status}
                        </span>
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
                  {request.assigned_technician?.full_name && (
                    <span>Technician: {request.assigned_technician.full_name}</span>
                  )}
                  {request.scheduled_date && (
                    <span className="flex items-center gap-1 text-blue-600 font-semibold">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(request.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {request.scheduled_time ? ` at ${request.scheduled_time}` : ''}
                    </span>
                  )}
                  {request.reviewed_at && (
                    <span>Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardList className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium mb-2">No maintenance requests</h3>
            <p className="text-sm mb-4">Submit a request when your device needs attention</p>
            {devices.length > 0 ? (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            ) : (
              <p className="text-sm">Add a device first to submit maintenance requests</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Maintenance Request</DialogTitle>
            <DialogDescription>Choose a preferred date and time for maintenance.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Select Device *</FieldLabel>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.brand} {device.model} ({device.device_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Issue Title *</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Paper jam, Print quality issues" />
            </Field>
            <Field>
              <FieldLabel>Description *</FieldLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={3} />
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Can wait</SelectItem>
                  <SelectItem value="medium">Medium - Affects work</SelectItem>
                  <SelectItem value="high">High - Urgent</SelectItem>
                  <SelectItem value="critical">Critical - Complete outage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Preferred Maintenance Date (optional)</FieldLabel>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !scheduledDate && 'text-muted-foreground')}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {scheduledDate
                      ? scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(d) => {
                      setScheduledDate(d)
                      setCalOpen(false)
                    }}
                    disabled={isDateBlockedForCurrentTime}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>
            {scheduledDate && (
              <Field>
                <FieldLabel>Preferred Time</FieldLabel>
                <div className="relative">
                  <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="time" className="pl-9" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Choose the hour you prefer. If not available, admins can adjust it later.</p>
                {!selectedSlotAvailable && (
                  <p className="text-xs text-destructive mt-1">
                    No technician is available for this date and time. Pick another slot.
                  </p>
                )}
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!selectedDevice || !title || !description || loading || !selectedSlotAvailable}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
