-- Add device_type (scanner|printer) to premium_datasets so the admin
-- can run the matching set of model branches automatically.

ALTER TABLE public.premium_datasets
  ADD COLUMN IF NOT EXISTS device_type TEXT;

UPDATE public.premium_datasets
   SET device_type = 'scanner'
 WHERE device_type IS NULL;

ALTER TABLE public.premium_datasets
  ALTER COLUMN device_type SET DEFAULT 'scanner',
  ALTER COLUMN device_type SET NOT NULL;

ALTER TABLE public.premium_datasets
  DROP CONSTRAINT IF EXISTS premium_datasets_device_type_check;

ALTER TABLE public.premium_datasets
  ADD CONSTRAINT premium_datasets_device_type_check
  CHECK (device_type IN ('scanner', 'printer'));

CREATE INDEX IF NOT EXISTS idx_premium_datasets_device_type
  ON public.premium_datasets(device_type);
