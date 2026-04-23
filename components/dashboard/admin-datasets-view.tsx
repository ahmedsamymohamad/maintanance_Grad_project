'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Database, Sparkles, AlertCircle, Crown, FileSpreadsheet } from 'lucide-react'

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

const BRANCH_OPTIONS = [
  { value: 'branch_1', label: 'Branch 1 - Scanner' },
  { value: 'branch_2', label: 'Branch 2 - Scanner' },
  { value: 'branch_3', label: 'Branch 3 - Scanner' },
  { value: 'branch_1_printer', label: 'Branch 1 - Printer' },
  { value: 'branch_2_printer', label: 'Branch 2 - Printer' },
  { value: 'branch_3_printer', label: 'Branch 3 - Printer' },
]

export function AdminDatasetsView({ datasets, predictionsByDataset }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<any>(null)
  const [branch, setBranch] = useState('')
  const [notes, setNotes] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const handleRun = async () => {
    if (!selected || !branch) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`/api/datasets/${selected.id}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_branch: branch, notes: notes.trim() || null }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload?.error || 'Failed to run model.')
      } else {
        setSelected(null)
        setBranch('')
        setNotes('')
        router.refresh()
      }
    } catch (e) {
      setError('Failed to run model.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          <Crown className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Admin · Premium Data</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Premium User Datasets</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Review datasets uploaded by premium users and run the predictive model on their data.
        </p>
      </div>

      {datasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center text-slate-500">
            <Database className="h-12 w-12 mb-3 opacity-60" />
            <p className="font-semibold">No premium datasets have been uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {datasets.map((d) => {
            const predictions = predictionsByDataset[d.id] || []
            const isOpen = openId === d.id
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
                        From {d.profiles?.full_name || d.profiles?.email || 'Unknown'} • {d.file_name}
                        {d.file_size_bytes ? ` • ${Math.round(d.file_size_bytes / 1024)} KB` : ''}
                      </CardDescription>
                      {d.description && (
                        <p className="text-sm text-slate-500 mt-2">{d.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Uploaded {new Date(d.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusBadge[d.status] || ''}>{d.status}</Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(d)
                          setError(null)
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Train & Predict
                      </Button>
                      {predictions.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenId(isOpen ? null : d.id)}
                        >
                          {isOpen ? 'Hide' : 'Show'} Runs ({predictions.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="space-y-4 pt-0">
                    {predictions.map((p) => (
                      <div key={p.id} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary">{p.model_branch}</Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(p.created_at).toLocaleString()}
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
                          <p className="text-sm text-slate-500">No rows.</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Train &amp; Predict on Dataset
            </DialogTitle>
            <DialogDescription>
              Run the trained predictive model on <span className="font-medium">{selected?.name}</span>. The results will be saved and shown to the premium user.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Model Branch</FieldLabel>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose model branch" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_OPTIONS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Notes for the user (optional)</FieldLabel>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
          </FieldGroup>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={handleRun} disabled={running || !branch}>
              {running ? 'Running model...' : 'Run Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
