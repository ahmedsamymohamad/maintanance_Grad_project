import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    if (!payload?.brand || !payload?.model || !payload?.serial_number) {
      return Response.json({ error: 'brand, model, and serial number are required.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const baseRow = {
      user_id: user.id,
      device_type: payload.device_type || 'printer',
      brand: String(payload.brand).trim(),
      model: String(payload.model).trim(),
      serial_number: String(payload.serial_number).trim(),
      purchase_date: payload.purchase_date || null,
      status: 'operational',
    }

    const rowWithLocation = {
      ...baseRow,
      location: payload.location || null,
    }

    // Try canonical schema first (warranty_expires), then fallback to legacy column name.
    let insertAttempt = await supabase
      .from('devices')
      .insert({
        ...rowWithLocation,
        warranty_expires: payload.warranty_expiry || null,
      })
      .select('*')
      .single()

    if (insertAttempt.error && insertAttempt.error.message.toLowerCase().includes('location')) {
      insertAttempt = await supabase
        .from('devices')
        .insert({
          ...baseRow,
          warranty_expires: payload.warranty_expiry || null,
        })
        .select('*')
        .single()
    }

    if (insertAttempt.error && insertAttempt.error.message.toLowerCase().includes('warranty_expires')) {
      insertAttempt = await supabase
        .from('devices')
        .insert({
          ...rowWithLocation,
          warranty_expiry: payload.warranty_expiry || null,
        })
        .select('*')
        .single()
    }

    if (insertAttempt.error && insertAttempt.error.message.toLowerCase().includes('location')) {
      insertAttempt = await supabase
        .from('devices')
        .insert({
          ...baseRow,
          warranty_expiry: payload.warranty_expiry || null,
        })
        .select('*')
        .single()
    }

    if (insertAttempt.error) {
      return Response.json({ error: insertAttempt.error.message }, { status: 500 })
    }

    return Response.json({ device: insertAttempt.data })
  } catch (error) {
    console.error('Add device error:', error)
    return Response.json({ error: 'Failed to add device.' }, { status: 500 })
  }
}
