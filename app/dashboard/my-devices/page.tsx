import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCurrentUser } from '@/lib/auth/session'
import { UserDevicesView } from '@/components/dashboard/user-devices-view'
import { inferBrandFromModel } from '@/lib/device/brand-inference'

const DEFAULT_DEVICE_CATALOG: Array<{ device_type: string; brand: string; model: string }> = [
  { device_type: 'printer', brand: 'HP', model: 'LaserJet Pro M404dn' },
  { device_type: 'printer', brand: 'HP', model: 'OfficeJet Pro 9015' },
  { device_type: 'printer', brand: 'Canon', model: 'PIXMA G3410' },
  { device_type: 'printer', brand: 'Brother', model: 'HL-L2350DW' },
  { device_type: 'printer', brand: 'Epson', model: 'EcoTank L3250' },
  { device_type: 'scanner', brand: 'HP', model: 'ScanJet Pro 2500 f1' },
  { device_type: 'scanner', brand: 'Canon', model: 'imageFORMULA DR-C225' },
  { device_type: 'scanner', brand: 'Brother', model: 'ADS-2200' },
  { device_type: 'scanner', brand: 'Epson', model: 'WorkForce DS-530' },
  { device_type: 'scanner', brand: 'Fujitsu', model: 'fi-7160' },
]

export default async function MyDevicesPage() {
  const supabase = createServiceRoleClient()
  const user = await requireCurrentUser()

  const { data: devices, error } = await supabase
    .from('devices')
    .select(`
      *,
      ai_predictions (id, predicted_issue, confidence_score, is_acknowledged, created_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load user devices:', error.message)
  }

  const { data: catalogRows, error: catalogError } = await supabase
    .from('devices')
    .select('device_type, brand, model')

  if (catalogError) {
    console.error('Failed to load device catalog:', catalogError.message)
  }

  const { data: premiumPredictionRows, error: premiumPredictionError } = await supabase
    .from('premium_predictions')
    .select('dataset_id, predictions')
    .order('created_at', { ascending: false })
    .limit(200)

  if (premiumPredictionError) {
    console.error('Failed to load premium prediction rows:', premiumPredictionError.message)
  }

  const datasetIds = [...new Set((premiumPredictionRows || []).map((row: any) => row.dataset_id).filter(Boolean))]

  const { data: premiumDatasets, error: premiumDatasetsError } = datasetIds.length > 0
    ? await supabase
        .from('premium_datasets')
        .select('id, device_type')
        .in('id', datasetIds)
    : { data: [] as any[], error: null as any }

  if (premiumDatasetsError) {
    console.error('Failed to map premium dataset types:', premiumDatasetsError.message)
  }

  const datasetTypeMap = new Map(
    (premiumDatasets || []).map((dataset: any) => [dataset.id, String(dataset.device_type || '').toLowerCase()]),
  )

  const catalogMap = new Map<string, { device_type: string; brand: string; model: string }>()

  for (const seed of DEFAULT_DEVICE_CATALOG) {
    const key = `${seed.device_type}::${seed.brand.toLowerCase()}::${seed.model.toLowerCase()}`
    catalogMap.set(key, seed)
  }

  for (const row of catalogRows || []) {
    const deviceType = String(row.device_type || '').trim().toLowerCase()
    const brand = String(row.brand || '').trim()
    const model = String(row.model || '').trim()

    if (!deviceType || !brand || !model) {
      continue
    }

    const key = `${deviceType}::${brand.toLowerCase()}::${model.toLowerCase()}`
    if (!catalogMap.has(key)) {
      catalogMap.set(key, { device_type: deviceType, brand, model })
    }
  }

  for (const predictionRow of premiumPredictionRows || []) {
    const inferredDeviceType = datasetTypeMap.get(predictionRow.dataset_id)
    const deviceType = inferredDeviceType === 'printer' ? 'printer' : inferredDeviceType === 'scanner' ? 'scanner' : ''

    if (!deviceType || !Array.isArray(predictionRow.predictions)) {
      continue
    }

    for (const item of predictionRow.predictions) {
      const modelLabel = String(item?.scanner_model || item?.printer_model || item?.model || '').trim()
      if (!modelLabel) {
        continue
      }

      // Try to infer brand from the model label; fall back to generic 'Dataset'
      const inferred = inferBrandFromModel(modelLabel)
      const brand = inferred || 'Dataset'
      const key = `${deviceType}::${brand.toLowerCase()}::${modelLabel.toLowerCase()}`
      if (!catalogMap.has(key)) {
        catalogMap.set(key, {
          device_type: deviceType,
          brand,
          model: modelLabel,
        })
      }
    }
  }

  const deviceCatalog = Array.from(catalogMap.values()).sort((a, b) => {
    if (a.device_type !== b.device_type) {
      return a.device_type.localeCompare(b.device_type)
    }

    const brandDiff = a.brand.localeCompare(b.brand)
    if (brandDiff !== 0) {
      return brandDiff
    }

    return a.model.localeCompare(b.model)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Devices</h1>
        <p className="text-muted-foreground">Manage your registered scanners and printers</p>
      </div>
      <UserDevicesView devices={devices || []} deviceCatalog={deviceCatalog} />
    </div>
  )
}
