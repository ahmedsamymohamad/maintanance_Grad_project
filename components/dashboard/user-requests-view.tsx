'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Plus, ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react'

interface UserRequestsViewProps {
  requests: any[]
  devices: any[]
}

export function UserRequestsView({ requests, devices }: UserRequestsViewProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Form state
  const [selectedDevice, setSelectedDevice] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')

  const router = useRouter()

  const handleSubmitRequest = async () => {
    if (!selectedDevice || !title || !description) return
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
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityColors[request.priority]}>{request.priority}</Badge>
                    <Badge className={statusConfig[request.status].color}>
                      <span className="flex items-center gap-1">
                        {statusConfig[request.status].icon}
                        {request.status}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
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

      {/* Submit Request Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Maintenance Request</DialogTitle>
            <DialogDescription>Describe the issue with your device</DialogDescription>
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
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Paper jam, Print quality issues" 
              />
            </Field>
            <Field>
              <FieldLabel>Description *</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
              />
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
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!selectedDevice || !title || !description || loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
