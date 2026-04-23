'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Crown, Database, Upload, Sparkles, FileSpreadsheet, AlertCircle } from 'lucide-react'

interface Props {
  datasets: any[]
  predictionsByDataset: Record<string, any[]>
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}

export function PremiumDatasetsView({ datasets, predictionsByDataset }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDatasetId, setOpenDatasetId] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setDescription('')
    setFile(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      setError('Please provide a name and select a file.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('description', description.trim())
      fd.append('file', file, file.name)

      const res = await fetch('/api/datasets', { method: 'POST', body: fd })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload?.error || 'Failed to upload dataset.')
      } else {
        setDialogOpen(false)
        reset()
        router.refresh()
      }
    } catch (e) {
      setError('Failed to upload dataset.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Premium User</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">My Datasets</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Upload your own scanner/printer telemetry. An admin will run the predictive model on your data and the results will appear below.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
          <Upload className="h-4 w-4 mr-2" />
          Upload Dataset
        </Button>
      </div>

      {datasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center text-slate-500">
            <Database className="h-12 w-12 mb-3 opacity-60" />
            <p className="font-semibold">No datasets uploaded yet</p>
            <p className="text-sm">Click "Upload Dataset" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {datasets.map((d) => {
            const predictions = predictionsByDataset[d.id] || []
            const latest = predictions[0]
            const isOpen = openDatasetId === d.id
            return (
              <Card key={d.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                        {d.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {d.description || d.file_name}
                      </CardDescription>
                      <p className="text-xs text-slate-400 mt-2">
                        Uploaded {new Date(d.created_at).toLocaleString()} • {d.file_name}
                        {d.file_size_bytes ? ` • ${Math.round(d.file_size_bytes / 1024)} KB` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusBadge[d.status] || ''}>{d.status}</Badge>
                      {predictions.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenDatasetId(isOpen ? null : d.id)}
                        >
                          {isOpen ? 'Hide' : 'Show'} Results ({predictions.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isOpen && latest && (
                  <CardContent className="pt-0 space-y-4">
                    {predictions.map((p) => (
                      <div key={p.id} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {p.model_branch}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            Run {new Date(p.created_at).toLocaleString()}
                          </span>
                          {p.summary && (
                            <span className="text-xs text-slate-500">
                              • {p.summary.total_devices ?? p.predictions?.length ?? 0} devices
                              • {p.summary.high_risk_count ?? 0} high-risk
                            </span>
                          )}
                        </div>
                        {p.notes && <p className="text-sm text-slate-600 mb-2">{p.notes}</p>}
                        {Array.isArray(p.predictions) && p.predictions.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left">
                                  <th className="py-2 pr-2">Serial</th>
                                  <th className="py-2 pr-2">Model</th>
                                  <th className="py-2 pr-2">Date</th>
                                  <th className="py-2 pr-2">Probability</th>
                                  <th className="py-2 pr-2">Risk</th>
                                  <th className="py-2">Recommendation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.predictions.map((row: any, i: number) => (
                                  <tr key={`${row.serial_number}-${i}`} className="border-b last:border-0">
                                    <td className="py-2 pr-2">{row.serial_number}</td>
                                    <td className="py-2 pr-2">{row.scanner_model}</td>
                                    <td className="py-2 pr-2">{row.date}</td>
                                    <td className="py-2 pr-2">
                                      {Math.round((row.failure_probability_next_7d || 0) * 100)}%
                                    </td>
                                    <td className="py-2 pr-2">{row.risk_level}</td>
                                    <td className="py-2">{row.recommendation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No prediction rows returned.</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}

                {d.status === 'pending' && predictions.length === 0 && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-500">
                      Waiting for an admin to run the predictive model on this dataset.
                    </p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Custom Dataset
            </DialogTitle>
            <DialogDescription>
              Upload a CSV/Excel file. An admin will run the predictive model and results will appear here.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Dataset Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. May Branch 1 Telemetry" />
            </Field>
            <Field>
              <FieldLabel>Description (optional)</FieldLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's in this dataset?" rows={3} />
            </Field>
            <Field>
              <FieldLabel>File (.csv, .xlsx, .xls)</FieldLabel>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Field>
          </FieldGroup>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !name.trim()}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
