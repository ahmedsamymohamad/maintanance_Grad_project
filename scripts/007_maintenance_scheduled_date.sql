-- Add scheduled_date to maintenance_requests so users can book a preferred date
-- and the calendar view can show all upcoming maintenance bookings.

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date
  ON public.maintenance_requests(scheduled_date);
