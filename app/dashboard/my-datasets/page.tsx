import { redirect } from 'next/navigation'
import { requireCurrentUser } from '@/lib/auth/session'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PremiumDatasetsView } from '@/components/dashboard/premium-datasets-view'

export default async function MyDatasetsPage() {
  const user = await requireCurrentUser()

  if (user.role !== 'premium_user' && user.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = createServiceRoleClient()

  const { data: datasets } = await supabase
    .from('premium_datasets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const datasetIds = (datasets || []).map((d: any) => d.id)
  let predictionsByDataset: Record<string, any[]> = {}

  if (datasetIds.length > 0) {
    const { data: preds } = await supabase
      .from('premium_predictions')
      .select('*')
      .in('dataset_id', datasetIds)
      .order('created_at', { ascending: false })

    for (const p of preds || []) {
      if (!predictionsByDataset[p.dataset_id]) predictionsByDataset[p.dataset_id] = []
      predictionsByDataset[p.dataset_id].push(p)
    }
  }

  return (
    <PremiumDatasetsView
      datasets={datasets || []}
      predictionsByDataset={predictionsByDataset}
    />
  )
}
