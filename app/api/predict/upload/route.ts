import path from 'node:path'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

type UploadedPrediction = {
  serial_number: string
  scanner_model: string
  date: string
  failure_probability_next_7d: number
  risk_level: string
  recommendation: string
}

function severityFromProbability(probability: number): 'low' | 'medium' | 'high' | 'critical' {
  if (probability < 0.3) return 'low'
  if (probability < 0.6) return 'medium'
  if (probability < 0.8) return 'high'
  return 'critical'
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    const filenameHeader = request.headers.get('x-filename') || 'dataset.csv'
    const selectedDeviceType = (request.headers.get('x-device-type') || '').trim()

    if (!selectedDeviceType) {
      return Response.json({ error: 'Device type is required.' }, { status: 400 })
    }

    let file: File | null = null
    let originalName = filenameHeader

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const formFile = formData.get('file')

      if (formFile instanceof File) {
        file = formFile
        originalName = formFile.name || filenameHeader
      }
    } else {
      const rawBuffer = await request.arrayBuffer()

      if (rawBuffer.byteLength > 0) {
        file = new File([rawBuffer], filenameHeader, {
          type: contentType || 'application/octet-stream',
        })
      }
    }

    if (!file) {
      return Response.json({ error: 'Dataset file is required.' }, { status: 400 })
    }

    const extension = path.extname(originalName).toLowerCase()

    if (!['.csv', '.xlsx', '.xls'].includes(extension)) {
      return Response.json({ error: 'Unsupported file type. Use CSV or Excel.' }, { status: 400 })
    }

    const modelApiUrl = process.env.MODEL_API_URL || 'http://127.0.0.1:8000'
    const uploadUrl = new URL('/predict/dataset', modelApiUrl)
    uploadUrl.searchParams.set('device_type', selectedDeviceType)

    const forwardFormData = new FormData()
    forwardFormData.append('file', file, originalName)

    const modelResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: forwardFormData,
    })

    const parsed = await modelResponse.json()

    if (!modelResponse.ok) {
      return Response.json(
        { error: parsed?.detail || parsed?.error || 'Model service request failed.' },
        { status: modelResponse.status },
      )
    }

    const predictions: UploadedPrediction[] = parsed?.predictions ?? []
    const serialNumbers = [...new Set(predictions.map((item) => item.serial_number).filter(Boolean))]

    let insertedCount = 0
    let skippedCount = 0

    const supabase = createServiceRoleClient()
    let serialToDeviceId = new Map<string, string>()

    if (serialNumbers.length > 0) {
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('id, serial_number')
        .in('serial_number', serialNumbers)

      if (devicesError) {
        return Response.json({ error: devicesError.message }, { status: 500 })
      }

      serialToDeviceId = new Map<string, string>()
      for (const device of devices || []) {
        serialToDeviceId.set(device.serial_number, device.id)
      }
    }

    const rowsToInsert = predictions
      .map((item) => {
        const deviceId = serialToDeviceId.get(item.serial_number) || null

        const baseDate = new Date(item.date)
        const estimatedDate = Number.isNaN(baseDate.getTime())
          ? null
          : new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

        return {
          device_id: deviceId,
          predicted_issue: `${item.scanner_model || 'Scanner'} [serial: ${item.serial_number}]`,
          confidence_score: item.failure_probability_next_7d,
          predicted_failure_date: estimatedDate ? estimatedDate.slice(0, 10) : null,
          severity: severityFromProbability(item.failure_probability_next_7d),
          recommended_action: `Dataset upload inference (${item.risk_level} risk): ${item.recommendation}`,
          is_acknowledged: false,
        }
      })

    skippedCount = rowsToInsert.filter((row) => !row.device_id).length

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('ai_predictions').insert(rowsToInsert)

      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 })
      }

      insertedCount = rowsToInsert.length
    }

    return Response.json({
      success: true,
      deviceType: selectedDeviceType,
      predictions,
      summary: parsed?.summary ?? null,
      persisted: {
        insertedCount,
        skippedCount,
      },
    })
  } catch (error) {
    console.error('Dataset prediction error:', error)
    return Response.json({ error: 'Failed to run prediction on uploaded dataset.' }, { status: 500 })
  }
}
