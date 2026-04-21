import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/session'
import { PredictionsView } from '@/components/dashboard/predictions-view'

export default async function PredictionsPage() {
  const supabase = await createClient()
  await requireRole(['admin'])

  const { data: predictions } = await supabase
    .from('ai_predictions')
    .select(`
      *,
      devices (id, brand, model, device_type, serial_number, user_id, profiles:user_id(full_name, email))
    `)
    .order('created_at', { ascending: false })

  const { data: devices } = await supabase
    .from('devices')
    .select('*, profiles:user_id(full_name)')
    .in('status', ['active', 'operational'])

  const { data: technicians } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'technician')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Predictions</h1>
        <p className="text-muted-foreground">AI-detected potential issues and maintenance predictions</p>
      </div>
      <PredictionsView 
        predictions={predictions || []} 
        devices={devices || []} 
        technicians={technicians || []} 
      />
    </div>
  )
}
