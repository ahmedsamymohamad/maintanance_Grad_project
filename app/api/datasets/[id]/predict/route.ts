import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

interface PredictionRow {
  serial_number: string
  scanner_model: string
  date: string
  failure_probability_next_7d: number
  risk_level: string
  recommendation: string
  best_branch?: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const notes = body?.notes ? String(body.notes) : null

    const supabase = createServiceRoleClient()

    const { data: dataset, error: datasetError } = await supabase
      .from('premium_datasets')
      .select('*')
      .eq('id', id)
      .single()

    if (datasetError || !dataset) {
      return Response.json({ error: 'Dataset not found.' }, { status: 404 })
    }

    const deviceType =
      (dataset.device_type || '').toLowerCase() === 'printer' ? 'printer' : 'scanner'

    await supabase
      .from('premium_datasets')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', id)

    try {
      const buffer = Buffer.from(dataset.file_data_base64, 'base64')
      const blob = new Blob([buffer], { type: dataset.file_mime || 'application/octet-stream' })
      const file = new File([blob], dataset.file_name, { type: dataset.file_mime || 'application/octet-stream' })

      const modelApiUrl = process.env.MODEL_API_URL || 'http://127.0.0.1:8000'
      const url = new URL('/predict/dataset/auto', modelApiUrl)
      url.searchParams.set('device_type', deviceType)

      const fwd = new FormData()
      fwd.append('file', file, dataset.file_name)

      const modelResponse = await fetch(url, { method: 'POST', body: fwd })
      const parsed = await modelResponse.json().catch(() => ({}))

      if (!modelResponse.ok) {
        await supabase
          .from('premium_datasets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', id)
        return Response.json(
          { error: parsed?.detail || parsed?.error || 'Model service request failed.' },
          { status: modelResponse.status },
        )
      }

      const predictions: PredictionRow[] = parsed?.predictions ?? []
      const branchesUsed: string[] = parsed?.branches_used ?? []
      const summary = parsed?.summary ?? {
        total_devices: predictions.length,
        high_risk_count: predictions.filter(
          (p) => (p.failure_probability_next_7d ?? 0) >= 0.6,
        ).length,
        branches_used: branchesUsed,
      }

      const modelBranchLabel = `best_of_3 (${deviceType}${
        branchesUsed.length ? `: ${branchesUsed.join(', ')}` : ''
      })`

      const { error: insertError } = await supabase.from('premium_predictions').insert({
        dataset_id: id,
        trained_by: user.id,
        model_branch: modelBranchLabel,
        predictions,
        summary,
        notes,
      })

      if (insertError) {
        await supabase
          .from('premium_datasets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', id)
        return Response.json({ error: insertError.message }, { status: 500 })
      }

      await supabase
        .from('premium_datasets')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', id)

      return Response.json({ success: true, predictions, summary, device_type: deviceType })
    } catch (innerError: any) {
      await supabase
        .from('premium_datasets')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', id)
      throw innerError
    }
  } catch (e: any) {
    console.error('Premium predict error:', e)
    return Response.json({ error: 'Failed to run predictive model on dataset.' }, { status: 500 })
  }
}
