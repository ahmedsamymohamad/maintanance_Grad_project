-- Persist assigned schedule on tasks so admin and technician views can read it directly.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status
  ON public.tasks(assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date
  ON public.tasks(scheduled_date);