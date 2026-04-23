-- Premium user role + dataset upload + admin-run predictions

-- 1. Allow 'premium_user' role on app_users
ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_role_check;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('admin', 'technician', 'user', 'premium_user'));

-- 2. Allow 'premium_user' role on profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'technician', 'user', 'premium_user'));

-- 3. premium_datasets: a dataset uploaded by a premium user
CREATE TABLE IF NOT EXISTS public.premium_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_mime TEXT,
  file_size_bytes INTEGER,
  -- raw file content stored as base64 text for portability through supabase-js
  file_data_base64 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_datasets_user_id ON public.premium_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_datasets_status ON public.premium_datasets(status);

-- 4. premium_predictions: results of running the model on a dataset
CREATE TABLE IF NOT EXISTS public.premium_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.premium_datasets(id) ON DELETE CASCADE,
  trained_by UUID REFERENCES public.profiles(id),
  model_branch TEXT NOT NULL,
  predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_predictions_dataset_id ON public.premium_predictions(dataset_id);

-- 5. RLS: enable but rely on service-role access from the API layer.
ALTER TABLE public.premium_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "premium_datasets_select_own_or_admin" ON public.premium_datasets;
CREATE POLICY "premium_datasets_select_own_or_admin"
  ON public.premium_datasets
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "premium_predictions_select_own_or_admin" ON public.premium_predictions;
CREATE POLICY "premium_predictions_select_own_or_admin"
  ON public.premium_predictions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.premium_datasets d
      WHERE d.id = dataset_id
        AND (d.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );
