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
import { Brain, AlertTriangle, CheckCircle, Clock, Plus, Sparkles, Upload } from 'lucide-react'

interface PredictionsViewProps {
  predictions: any[]
  devices: any[]
  technicians: any[]
}

export function PredictionsView({ predictions, devices, technicians }: PredictionsViewProps) {
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)
  const [runPredictionDialogOpen, setRunPredictionDialogOpen] = useState(false)
  const [uploadDatasetDialogOpen, setUploadDatasetDialogOpen] = useState(false)
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)
  const [selectedDevice, setSelectedDevice] = useState('')
  const [selectedTechnician, setSelectedTechnician] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [datasetFile, setDatasetFile] = useState<File | null>(null)
  const [datasetDeviceType, setDatasetDeviceType] = useState('')
  const [datasetResults, setDatasetResults] = useState<any[]>([])
  const [datasetSummary, setDatasetSummary] = useState<{ total_scanners: number; high_risk_count: number } | null>(null)
  const [datasetError, setDatasetError] = useState<string | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [uploadingDataset, setUploadingDataset] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreateTask = async () => {
    if (!selectedPrediction || !selectedTechnician) return
    setLoading(true)

    // Create task from prediction
    await supabase.from('tasks').insert({
      prediction_id: selectedPrediction.id,
      device_id: selectedPrediction.device_id,
      assigned_to: selectedTechnician,
      title: `AI Prediction: ${selectedPrediction.predicted_issue}`,
      description: taskDescription || selectedPrediction.recommended_action,
      priority: (selectedPrediction.confidence_score || 0) > 0.8 ? 'high' : (selectedPrediction.confidence_score || 0) > 0.5 ? 'medium' : 'low',
      status: 'assigned',
    })

    // Update prediction status
    await supabase
      .from('ai_predictions')
      .update({ is_acknowledged: true })
      .eq('id', selectedPrediction.id)

    setLoading(false)
    setCreateTaskDialogOpen(false)
    setSelectedTechnician('')
    setTaskDescription('')
    router.refresh()
  }

  const handleRunPrediction = async () => {
    if (!selectedDevice) return
    setPredicting(true)
    setPredictionError(null)

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDevice }),
      })

      const payload = await response.json().catch(() => ({}))

      if (response.ok) {
        router.refresh()
      } else {
        setPredictionError(payload?.error || 'Prediction save failed.')
      }
    } catch (error) {
      console.error('Prediction failed:', error)
      setPredictionError('Prediction save failed.')
    }

    setPredicting(false)
    setRunPredictionDialogOpen(false)
    setSelectedDevice('')
  }

  const handleMarkResolved = async (predictionId: string) => {
    setLoading(true)
    await supabase
      .from('ai_predictions')
      .update({ is_acknowledged: true })
      .eq('id', predictionId)
    setLoading(false)
    router.refresh()
  }

  const handleDatasetUpload = async () => {
    if (!datasetFile) return

    setUploadingDataset(true)
    setDatasetError(null)

    try {
      const response = await fetch('/api/predict/upload', {
        method: 'POST',
        headers: {
          'Content-Type': datasetFile.type || 'application/octet-stream',
          'x-filename': datasetFile.name,
          'x-device-type': datasetDeviceType,
        },
        body: datasetFile,
      })

      const payload = await response.json()

      if (!response.ok) {
        setDatasetError(payload?.error || 'Failed to upload dataset.')
        return
      }

      setDatasetResults(payload?.predictions || [])
      setDatasetSummary(payload?.summary || null)
      setUploadDatasetDialogOpen(false)
      setDatasetFile(null)
      setDatasetDeviceType('')
    } catch (error) {
      console.error('Dataset upload failed:', error)
      setDatasetError('Failed to upload dataset.')
    } finally {
      setUploadingDataset(false)
    }
  }

  const pendingPredictions = predictions.filter(p => !p.is_acknowledged)
  const acknowledgedPredictions = predictions.filter(p => p.is_acknowledged)
  const resolvedPredictions = predictions.filter(p => p.is_acknowledged)

  const typeColors: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    failure: 'destructive',
    maintenance: 'secondary',
    replacement: 'outline',
  }

  const PredictionCard = ({ prediction }: { prediction: any }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {prediction.predicted_issue}
              {(prediction.confidence_score || 0) > 0.7 && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
            <CardDescription>
              {prediction.devices?.brand} {prediction.devices?.model}
            </CardDescription>
          </div>
          <Badge variant={(prediction.confidence_score || 0) > 0.7 ? 'destructive' : 'secondary'}>
            {Math.round((prediction.confidence_score || 0) * 100)}% risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground capitalize">
              {prediction.devices?.device_type}
            </span>
          </div>
          
          {prediction.recommended_action && (
            <p className="text-sm text-muted-foreground">{prediction.recommended_action}</p>
          )}
          
          {prediction.predicted_failure_date && (
            <div className="text-sm">
              <span className="text-muted-foreground">Estimated:</span>{' '}
              {new Date(prediction.predicted_failure_date).toLocaleDateString()}
            </div>
          )}
          
          <div className="text-sm">
            <span className="text-muted-foreground">Owner:</span>{' '}
            {prediction.devices?.profiles?.full_name || 'Unknown'}
          </div>

          <div className="flex gap-2 pt-2">
            {!prediction.is_acknowledged && (
              <>
                <Button 
                  size="sm"
                  onClick={() => {
                    setSelectedPrediction(prediction)
                    setCreateTaskDialogOpen(true)
                  }}
                >
                  Create Task
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleMarkResolved(prediction.id)}
                  disabled={loading}
                >
                  Mark Resolved
                </Button>
              </>
            )}
            {prediction.is_acknowledged && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleMarkResolved(prediction.id)}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Acknowledged
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        <Button variant="outline" onClick={() => setUploadDatasetDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Dataset
        </Button>
        <Button onClick={() => setRunPredictionDialogOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Run AI Analysis
        </Button>
      </div>

      {predictionError && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{predictionError}</p>
          </CardContent>
        </Card>
      )}

      {(datasetResults.length > 0 || datasetError) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Uploaded Dataset Predictions</CardTitle>
            <CardDescription>
              {datasetSummary
                ? `Scanners analyzed: ${datasetSummary.total_scanners} | High/Critical risk: ${datasetSummary.high_risk_count}`
                : 'Latest results from the uploaded dataset'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {datasetError && (
              <p className="text-sm text-destructive mb-4">{datasetError}</p>
            )}

            {datasetResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-2">Serial Number</th>
                      <th className="py-2 pr-2">Scanner Model</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Probability</th>
                      <th className="py-2 pr-2">Risk</th>
                      <th className="py-2">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasetResults.map((row, index) => (
                      <tr key={`${row.serial_number}-${index}`} className="border-b">
                        <td className="py-2 pr-2">{row.serial_number}</td>
                        <td className="py-2 pr-2">{row.scanner_model}</td>
                        <td className="py-2 pr-2">{row.date}</td>
                        <td className="py-2 pr-2">{Math.round((row.failure_probability_next_7d || 0) * 100)}%</td>
                        <td className="py-2 pr-2">{row.risk_level}</td>
                        <td className="py-2">{row.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pending ({pendingPredictions.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            In Progress ({acknowledgedPredictions.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolved ({resolvedPredictions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingPredictions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingPredictions.map(prediction => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                <p>No pending predictions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="acknowledged" className="mt-4">
          {acknowledgedPredictions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {acknowledgedPredictions.map(prediction => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mb-2" />
                <p>No predictions being worked on</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {resolvedPredictions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {resolvedPredictions.map(prediction => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mb-2" />
                <p>No resolved predictions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Task from Prediction
            </DialogTitle>
            <DialogDescription>
              Assign a technician to address this AI prediction
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Prediction</FieldLabel>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedPrediction?.component}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPrediction?.devices?.brand} {selectedPrediction?.devices?.model} - {selectedPrediction?.prediction_type}
                </p>
              </div>
            </Field>
            <Field>
              <FieldLabel>Assign Technician</FieldLabel>
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
                placeholder="Additional instructions..."
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!selectedTechnician || loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Prediction Dialog */}
      <Dialog open={runPredictionDialogOpen} onOpenChange={setRunPredictionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Run AI Analysis
            </DialogTitle>
            <DialogDescription>
              Select a device to analyze for potential issues
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Select Device</FieldLabel>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.brand} {device.model} ({device.device_type}) - {device.profiles?.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunPredictionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRunPrediction} disabled={!selectedDevice || predicting}>
              {predicting ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dataset Dialog */}
      <Dialog open={uploadDatasetDialogOpen} onOpenChange={setUploadDatasetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Dataset for Model Prediction
            </DialogTitle>
            <DialogDescription>
              Upload CSV or Excel data to run the trained model and return scanner risk predictions.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Device Type (Model Branch)</FieldLabel>
              <Select value={datasetDeviceType} onValueChange={setDatasetDeviceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose device type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch_1">Branch 1 - Scanner</SelectItem>
                  <SelectItem value="branch_2">Branch 2 - Scanner</SelectItem>
                  <SelectItem value="branch_3">Branch 3 - Scanner</SelectItem>
                  <SelectItem value="branch_1_printer">Branch 1 - Printer</SelectItem>
                  <SelectItem value="branch_2_printer">Branch 2 - Printer</SelectItem>
                  <SelectItem value="branch_3_printer">Branch 3 - Printer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Dataset File (.csv, .xlsx, .xls)</FieldLabel>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null
                  setDatasetFile(file)
                  setDatasetError(null)
                }}
              />
            </Field>
            {datasetError && (
              <p className="text-sm text-destructive">{datasetError}</p>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDatasetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDatasetUpload} disabled={!datasetFile || !datasetDeviceType || uploadingDataset}>
              {uploadingDataset ? 'Processing...' : 'Run Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
