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
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Cpu, Plus, AlertTriangle, Printer, ScanLine } from 'lucide-react'

interface UserDevicesViewProps {
  devices: any[]
}

export function UserDevicesView({ devices }: UserDevicesViewProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Form state
  const [deviceType, setDeviceType] = useState<string>('printer')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [location, setLocation] = useState('')

  const router = useRouter()

  const handleAddDevice = async () => {
    if (!brand || !model || !serialNumber) return
    setLoading(true)
    setErrorMessage(null)

    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_type: deviceType,
        brand,
        model,
        serial_number: serialNumber,
        purchase_date: purchaseDate || null,
        warranty_expiry: warrantyExpiry || null,
        location: location || null,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setLoading(false)
      setErrorMessage(payload?.error || 'Failed to add device')
      return
    }

    setLoading(false)
    setAddDialogOpen(false)
    resetForm()
    router.refresh()
  }

  const resetForm = () => {
    setDeviceType('printer')
    setBrand('')
    setModel('')
    setSerialNumber('')
    setPurchaseDate('')
    setWarrantyExpiry('')
    setLocation('')
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    operational: 'bg-green-100 text-green-800',
    maintenance: 'bg-amber-100 text-amber-800',
    needs_maintenance: 'bg-amber-100 text-amber-800',
    under_repair: 'bg-blue-100 text-blue-800',
    decommissioned: 'bg-red-100 text-red-800',
  }

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === 'printer') return <Printer className="h-8 w-8 text-primary" />
    if (type === 'scanner') return <ScanLine className="h-8 w-8 text-primary" />
    return <Cpu className="h-8 w-8 text-primary" />
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {errorMessage && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {devices.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => {
            const pendingPredictions = device.ai_predictions?.filter((p: any) => !p.is_acknowledged) || []
            
            return (
              <Card key={device.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <DeviceIcon type={device.device_type} />
                      <div>
                        <CardTitle className="text-lg">{device.brand} {device.model}</CardTitle>
                        <CardDescription className="capitalize">{device.device_type}</CardDescription>
                      </div>
                    </div>
                    <Badge className={statusColors[device.status]}>{device.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial:</span>
                      <span>{device.serial_number}</span>
                    </div>
                    {device.location && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{device.location}</span>
                      </div>
                    )}
                    {(device.warranty_expiry || device.warranty_expires) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Warranty:</span>
                        <span className={new Date(device.warranty_expiry || device.warranty_expires) < new Date() ? 'text-destructive' : ''}>
                          {new Date(device.warranty_expiry || device.warranty_expires).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {pendingPredictions.length > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {pendingPredictions.length} AI alert{pendingPredictions.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {pendingPredictions.slice(0, 2).map((pred: any) => (
                          <li key={pred.id} className="text-xs text-amber-600">
                            {pred.predicted_issue} - {Math.round((pred.confidence_score || 0) * 100)}% risk
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Cpu className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium mb-2">No devices registered</h3>
            <p className="text-sm mb-4">Add your first scanner or printer to start monitoring</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Device
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Device Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>Register a scanner or printer for maintenance monitoring</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Device Type *</FieldLabel>
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="printer">Printer</SelectItem>
                  <SelectItem value="scanner">Scanner</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Brand *</FieldLabel>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., HP" />
              </Field>
              <Field>
                <FieldLabel>Model *</FieldLabel>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., LaserJet Pro" />
              </Field>
            </div>
            <Field>
              <FieldLabel>Serial Number *</FieldLabel>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="e.g., ABC123XYZ" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Purchase Date</FieldLabel>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Warranty Expiry</FieldLabel>
                <Input type="date" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Office 2nd Floor" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAddDevice} disabled={!brand || !model || !serialNumber || loading}>
              {loading ? 'Adding...' : 'Add Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
