import path from 'node:path'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

const ALLOWED_EXT = ['.csv', '.xlsx', '.xls']
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'premium_user' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
    }

    const form = await request.formData()
    const name = ((form.get('name') as string) || '').trim()
    const description = ((form.get('description') as string) || '').trim() || null
    const file = form.get('file')
    const deviceTypeRaw = ((form.get('device_type') as string) || '').trim().toLowerCase()
    const deviceType = deviceTypeRaw === 'printer' ? 'printer' : deviceTypeRaw === 'scanner' ? 'scanner' : ''

    if (!name) return Response.json({ error: 'Dataset name is required.' }, { status: 400 })
    if (!deviceType) {
      return Response.json({ error: 'Please choose Scanner or Printer for this dataset.' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return Response.json({ error: 'Dataset file is required.' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      return Response.json({ error: 'Unsupported file type. Use CSV or Excel.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.byteLength === 0) {
      return Response.json({ error: 'Uploaded file is empty.' }, { status: 400 })
    }
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB).` }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('premium_datasets')
      .insert({
        user_id: user.id,
        name,
        description,
        device_type: deviceType,
        file_name: file.name,
        file_mime: file.type || 'application/octet-stream',
        file_size_bytes: buffer.byteLength,
        file_data_base64: buffer.toString('base64'),
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, id: data?.id })
  } catch (e: any) {
    console.error('Dataset upload error:', e)
    return Response.json({ error: 'Failed to upload dataset.' }, { status: 500 })
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceRoleClient()
  let query = supabase
    .from('premium_datasets')
    .select('id, user_id, name, description, device_type, file_name, file_mime, file_size_bytes, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (user.role !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ datasets: data || [] })
}
