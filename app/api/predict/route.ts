import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const predictionSchema = z.object({
  predictions: z.array(z.object({
    component: z.string().describe('The component that may have issues (e.g., "Toner Cartridge", "Drum Unit", "Scanner Lamp")'),
    prediction_type: z.enum(['failure', 'maintenance', 'replacement']).describe('Type of predicted issue'),
    probability: z.number().min(0).max(1).describe('Probability of the issue occurring (0-1)'),
    estimated_days: z.number().nullable().describe('Estimated days until issue occurs'),
    reasoning: z.string().describe('Brief explanation for this prediction'),
  }))
})

type AIPrediction = z.infer<typeof predictionSchema>['predictions'][number]

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

    const { deviceId } = await request.json()
    
    if (!deviceId) {
      return Response.json({ error: 'Device ID required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Fetch device info
    const { data: device } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (!device) {
      return Response.json({ error: 'Device not found' }, { status: 404 })
    }

    // Fetch recent health logs
    const { data: healthLogs } = await supabase
      .from('device_health_logs')
      .select('*')
      .eq('device_id', deviceId)
      .order('logged_at', { ascending: false })
      .limit(10)

    // Fetch existing predictions
    // Build context for AI
    const deviceAge = device.purchase_date 
      ? Math.floor((Date.now() - new Date(device.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : null

    const prompt = `You are an expert maintenance prediction system for office equipment (printers and scanners).

Analyze this device and its health data to predict potential issues:

Device Information:
- Type: ${device.device_type}
- Brand: ${device.brand}
- Model: ${device.model}
- Status: ${device.status}
- Age: ${deviceAge ? `${deviceAge} years` : 'Unknown'}
- Warranty: ${device.warranty_expiry ? (new Date(device.warranty_expiry) > new Date() ? 'Active' : 'Expired') : 'Unknown'}

${healthLogs && healthLogs.length > 0 ? `
Recent Health Logs:
${healthLogs.map(log => `
- Date: ${log.logged_at}
- Error Codes: ${log.error_codes?.join(', ') || 'None'}
- Usage Hours: ${log.usage_hours || 'N/A'}
- Print Count: ${log.print_count || 'N/A'}
- Scan Count: ${log.scan_count || 'N/A'}
- Paper Jams: ${log.paper_jams || 0}
- Toner Level: ${log.toner_level ? `${log.toner_level}%` : 'N/A'}
- Drum Condition: ${log.drum_condition ? `${log.drum_condition}%` : 'N/A'}
- Notes: ${log.notes || 'None'}
`).join('\n')}
` : 'No health logs available - make predictions based on device age and type.'}

Based on this information, predict potential issues that may occur. Consider:
1. Component wear based on usage patterns
2. Common failure points for this device type
3. Age-related degradation
4. Error code patterns
5. Consumable replacement needs

Provide 1-3 predictions with realistic probabilities. Only predict issues that have meaningful probability (> 0.2).`

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
      output: Output.object({ schema: predictionSchema }),
    })

    const aiPredictions: AIPrediction[] = result.output?.predictions ?? []

    // Save predictions to database
    const predictionsToInsert = aiPredictions
      .map((p: AIPrediction) => ({
        device_id: deviceId,
        predicted_issue: `${p.component} (${p.prediction_type})`,
        confidence_score: p.probability,
        predicted_failure_date: p.estimated_days 
          ? new Date(Date.now() + p.estimated_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : null,
        severity: severityFromProbability(p.probability),
        recommended_action: p.reasoning,
        is_acknowledged: false,
      }))

    if (predictionsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('ai_predictions').insert(predictionsToInsert)
      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 })
      }
    }

    return Response.json({ 
      success: true, 
      predictions: predictionsToInsert,
      persisted: {
        insertedCount: predictionsToInsert.length,
      },
      message: `Generated ${predictionsToInsert.length} predictions`
    })

  } catch (error) {
    console.error('Prediction error:', error)
    return Response.json({ error: 'Prediction failed' }, { status: 500 })
  }
}
