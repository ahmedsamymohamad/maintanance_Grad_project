import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false as const, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (user.role !== 'admin') {
    return { ok: false as const, response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, user }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin()
  if (!access.ok) return access.response

  const { id } = await context.params
  const payload = await request.json()
  const action = payload?.action as 'approve' | 'deny'

  if (!action || !['approve', 'deny'].includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const status = action === 'approve' ? 'approved' : 'denied'
  let requestUpdateAttempt = await supabase
    .from('parts_requests')
    .update({ status, approved_by: access.user.id })
    .eq('id', id)

  // Fallback for schemas without approved_by column.
  if (requestUpdateAttempt.error && requestUpdateAttempt.error.message.toLowerCase().includes('approved_by')) {
    requestUpdateAttempt = await supabase
      .from('parts_requests')
      .update({ status })
      .eq('id', id)
  }

  const requestError = requestUpdateAttempt.error

  if (requestError) {
    return Response.json({ error: requestError.message }, { status: 500 })
  }

  if (action === 'approve' && payload?.inventory_item_id && payload?.quantity_requested) {
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, quantity')
      .eq('id', payload.inventory_item_id)
      .single()

    if (itemError) {
      return Response.json({ error: itemError.message }, { status: 500 })
    }

    const nextQuantity = Math.max(0, Number(item.quantity) - Number(payload.quantity_requested))
    const { error: quantityError } = await supabase
      .from('inventory_items')
      .update({ quantity: nextQuantity })
      .eq('id', payload.inventory_item_id)

    if (quantityError) {
      return Response.json({ error: quantityError.message }, { status: 500 })
    }
  }

  return Response.json({ success: true })
}
