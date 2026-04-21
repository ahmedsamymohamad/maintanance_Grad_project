'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Play, CheckCircle, FileText, Package, AlertTriangle, Wrench } from 'lucide-react'

interface TechnicianTasksViewProps {
  tasks: any[]
  inventory: any[]
  technicianId: string
}

export function TechnicianTasksView({ tasks, inventory, technicianId }: TechnicianTasksViewProps) {
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [partsDialogOpen, setPartsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Report form state
  const [deviceStatus, setDeviceStatus] = useState<string>('working')
  const [workPerformed, setWorkPerformed] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [timeSpent, setTimeSpent] = useState('')
  
  // Parts request state
  const [selectedPart, setSelectedPart] = useState('')
  const [partQuantity, setPartQuantity] = useState('1')
  const [partNotes, setPartNotes] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleStartTask = async (taskId: string) => {
    setLoading(true)
    setErrorMessage(null)

    const response = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setLoading(false)
      setErrorMessage(payload?.error || 'Failed to start task')
      return
    }

    setLoading(false)
    router.refresh()
  }

  const handleSubmitReport = async () => {
    if (!selectedTask || !workPerformed) return
    setLoading(true)
    setErrorMessage(null)

    // Create report
    await supabase.from('task_reports').insert({
      task_id: selectedTask.id,
      technician_id: technicianId,
      device_status_after: deviceStatus === 'working' ? 'operational' : deviceStatus === 'needs_repair' ? 'needs_further_repair' : 'decommissioned',
      work_performed: workPerformed,
      diagnosis: diagnosis || null,
      feedback: recommendations || null,
      time_spent_minutes: timeSpent ? parseInt(timeSpent) : null,
    })

    // Mark task as completed
    const completeResponse = await fetch(`/api/tasks/${selectedTask.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })

    if (!completeResponse.ok) {
      const payload = await completeResponse.json().catch(() => ({}))
      setLoading(false)
      setErrorMessage(payload?.error || 'Failed to complete task')
      return
    }

    // Update device status based on report
    if (deviceStatus === 'working') {
      await supabase
        .from('devices')
        .update({ status: 'operational' })
        .eq('id', selectedTask.device_id)
    } else if (deviceStatus === 'unrepairable') {
      await supabase
        .from('devices')
        .update({ status: 'decommissioned' })
        .eq('id', selectedTask.device_id)
    }

    setLoading(false)
    setReportDialogOpen(false)
    resetReportForm()
    router.refresh()
  }

  const handleRequestParts = async () => {
    if (!selectedTask || !selectedPart) return
    setLoading(true)
    setErrorMessage(null)

    const response = await fetch('/api/parts-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: selectedTask.id,
        inventory_item_id: selectedPart,
        quantity_requested: parseInt(partQuantity),
        notes: partNotes || null,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setLoading(false)
      setErrorMessage(payload?.error || 'Failed to request parts')
      return
    }

    setLoading(false)
    setPartsDialogOpen(false)
    setSelectedPart('')
    setPartQuantity('1')
    setPartNotes('')
    router.refresh()
  }

  const resetReportForm = () => {
    setDeviceStatus('working')
    setWorkPerformed('')
    setDiagnosis('')
    setRecommendations('')
    setTimeSpent('')
  }

  const assignedTasks = tasks.filter(t => t.status === 'assigned')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  const priorityColors: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
  }

  const TaskCard = ({ task }: { task: any }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {task.title}
              {task.priority === 'critical' && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
            <CardDescription>
              {task.devices?.brand} {task.devices?.model}
            </CardDescription>
          </div>
          <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Type:</span>{' '}
            <span className="capitalize">{task.devices?.device_type}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Serial:</span>{' '}
            {task.devices?.serial_number}
          </div>
          {task.devices?.location && (
            <div className="text-sm">
              <span className="text-muted-foreground">Location:</span>{' '}
              {task.devices.location}
            </div>
          )}
          {task.description && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes:</span>{' '}
              {task.description}
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            {task.status === 'assigned' && (
              <Button 
                size="sm" 
                onClick={() => handleStartTask(task.id)}
                disabled={loading}
              >
                <Play className="h-4 w-4 mr-1" />
                Start Task
              </Button>
            )}
            {task.status === 'in_progress' && (
              <>
                <Button 
                  size="sm"
                  onClick={() => {
                    setSelectedTask(task)
                    setReportDialogOpen(true)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(task)
                    setPartsDialogOpen(true)
                  }}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Request Parts
                </Button>
              </>
            )}
            {task.status === 'completed' && task.task_reports?.length > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedTask(task)
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                View Report
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      {errorMessage && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="in_progress">
        <TabsList>
          <TabsTrigger value="assigned">
            Assigned ({assignedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgressTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-4">
          {assignedTasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {assignedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mb-2" />
                <p>No assigned tasks waiting</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          {inProgressTasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                <p>No tasks in progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedTasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2" />
                <p>No completed tasks yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submit Task Report
            </DialogTitle>
            <DialogDescription>
              Report your findings and work performed for: {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Device Status After Service</FieldLabel>
              <Select value={deviceStatus} onValueChange={setDeviceStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="working">Working - Fixed</SelectItem>
                  <SelectItem value="needs_repair">Needs Further Repair</SelectItem>
                  <SelectItem value="unrepairable">Unrepairable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Work Performed *</FieldLabel>
              <Textarea
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                placeholder="Describe the work you performed..."
                rows={3}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Diagnosis</FieldLabel>
              <Textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="What was the root cause of the issue?"
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel>Recommendations</FieldLabel>
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Any recommendations for future maintenance?"
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel>Time Spent (minutes)</FieldLabel>
              <Input
                type="number"
                value={timeSpent}
                onChange={(e) => setTimeSpent(e.target.value)}
                placeholder="e.g., 60"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={!workPerformed || loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Parts Dialog */}
      <Dialog open={partsDialogOpen} onOpenChange={setPartsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Request Parts
            </DialogTitle>
            <DialogDescription>
              Request parts needed for: {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Select Part</FieldLabel>
              <Select value={selectedPart} onValueChange={setSelectedPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a part" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.part_name || item.name} ({item.quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Quantity</FieldLabel>
              <Input
                type="number"
                min="1"
                value={partQuantity}
                onChange={(e) => setPartQuantity(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="Why is this part needed?"
                rows={2}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestParts} disabled={!selectedPart || loading}>
              {loading ? 'Requesting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
