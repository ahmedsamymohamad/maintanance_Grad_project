-- Maintenance System Database Schema

-- Profiles table for users (admins and technicians)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'user')) DEFAULT 'user',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table (scanners and printers)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('scanner', 'printer')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT UNIQUE,
  purchase_date DATE,
  warranty_expires DATE,
  last_maintenance DATE,
  status TEXT NOT NULL CHECK (status IN ('operational', 'needs_maintenance', 'under_repair', 'decommissioned')) DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device health logs for AI predictions
CREATE TABLE IF NOT EXISTS public.device_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  print_count INTEGER DEFAULT 0,
  scan_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  paper_jams INTEGER DEFAULT 0,
  ink_level INTEGER CHECK (ink_level >= 0 AND ink_level <= 100),
  toner_level INTEGER CHECK (toner_level >= 0 AND toner_level <= 100),
  drum_usage_percent INTEGER CHECK (drum_usage_percent >= 0 AND drum_usage_percent <= 100),
  temperature_celsius DECIMAL(5,2),
  humidity_percent INTEGER,
  last_error_code TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Predictions table
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  predicted_issue TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  predicted_failure_date DATE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  recommended_action TEXT,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance requests
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id),
  prediction_id UUID REFERENCES public.ai_predictions(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks assigned to technicians
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL CHECK (status IN ('assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')) DEFAULT 'assigned',
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technician reports/feedback
CREATE TABLE IF NOT EXISTS public.task_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.profiles(id),
  diagnosis TEXT,
  work_performed TEXT,
  device_status_after TEXT CHECK (device_status_after IN ('operational', 'needs_parts', 'needs_further_repair', 'decommissioned')),
  time_spent_minutes INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('ink', 'toner', 'drum', 'paper', 'roller', 'fuser', 'scanner_glass', 'cable', 'other')),
  compatible_device_types TEXT[] DEFAULT '{}',
  compatible_brands TEXT[] DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  unit_price DECIMAL(10,2),
  supplier TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts used in repairs
CREATE TABLE IF NOT EXISTS public.parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  quantity_used INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts requested by technicians
CREATE TABLE IF NOT EXISTS public.parts_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id),
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'fulfilled')) DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Devices: admins see all, technicians see assigned, users see own
CREATE POLICY "devices_select" ON public.devices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.maintenance_requests mr ON t.request_id = mr.id
    WHERE mr.device_id = devices.id AND t.assigned_to = auth.uid()
  )
);
CREATE POLICY "devices_insert" ON public.devices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'user'))
);
CREATE POLICY "devices_update" ON public.devices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);

-- Device health logs: admins and technicians can view
CREATE POLICY "device_health_logs_select" ON public.device_health_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
  OR EXISTS (SELECT 1 FROM public.devices WHERE id = device_id AND user_id = auth.uid())
);
CREATE POLICY "device_health_logs_insert" ON public.device_health_logs FOR INSERT WITH CHECK (true);

-- AI Predictions: admins see all, others see their devices
CREATE POLICY "ai_predictions_select" ON public.ai_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.devices WHERE id = device_id AND user_id = auth.uid())
);
CREATE POLICY "ai_predictions_insert" ON public.ai_predictions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "ai_predictions_update" ON public.ai_predictions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Maintenance requests: admins see all, users see own
CREATE POLICY "maintenance_requests_select" ON public.maintenance_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
  OR requested_by = auth.uid()
);
CREATE POLICY "maintenance_requests_insert" ON public.maintenance_requests FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "maintenance_requests_update" ON public.maintenance_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR requested_by = auth.uid()
);

-- Tasks: admins see all, technicians see assigned
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR assigned_to = auth.uid()
);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR assigned_to = auth.uid()
);

-- Task reports: admins and technicians
CREATE POLICY "task_reports_select" ON public.task_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "task_reports_insert" ON public.task_reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'technician')
);

-- Inventory: admins can manage, technicians can view
CREATE POLICY "inventory_items_select" ON public.inventory_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "inventory_items_insert" ON public.inventory_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "inventory_items_update" ON public.inventory_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "inventory_items_delete" ON public.inventory_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Parts used
CREATE POLICY "parts_used_select" ON public.parts_used FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "parts_used_insert" ON public.parts_used FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'technician')
);

-- Parts requests
CREATE POLICY "parts_requests_select" ON public.parts_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "parts_requests_insert" ON public.parts_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'technician')
);
CREATE POLICY "parts_requests_update" ON public.parts_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
