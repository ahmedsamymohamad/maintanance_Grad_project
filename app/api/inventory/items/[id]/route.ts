import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

const ALLOWED_CATEGORIES = new Set([
  'ink',
  'toner',
  'drum',
  'paper',
  'roller',
  'fuser',
  'scanner_glass',
  'cable',
  'other',
])

function normalizeCategory(input?: string | null) {
  const normalized = (input || 'other').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (normalized === 'general') {
    return 'other'
  }

  return ALLOWED_CATEGORIES.has(normalized) ? normalized : 'other'
}

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false as const, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (user.role !== 'admin') {
    return { ok: false as const, response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin()
  if (!access.ok) return access.response

  const { id } = await context.params
  const payload = await request.json()

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      name: payload.name,
      description: payload.description || null,
      category: normalizeCategory(payload.category),
      quantity: Number(payload.quantity),
      min_quantity: Number(payload.min_quantity),
      unit_price: payload.unit_price != null ? Number(payload.unit_price) : null,
      location: payload.location || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ item: data })
}
