export type UserRole = 'admin' | 'technician' | 'user' | 'premium_user'

export interface PremiumDataset {
  id: string
  user_id: string
  name: string
  description: string | null
  file_name: string
  file_mime: string | null
  file_size_bytes: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface PremiumPredictionRow {
  serial_number: string
  scanner_model: string
  date: string
  failure_probability_next_7d: number
  risk_level: string
  recommendation: string
}

export interface PremiumPrediction {
  id: string
  dataset_id: string
  trained_by: string | null
  model_branch: string
  predictions: PremiumPredictionRow[]
  summary: { total_devices?: number; high_risk_count?: number } | null
  notes: string | null
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Device {
  id: string
  user_id: string
  device_type: 'scanner' | 'printer'
  brand: string
  model: string
  serial_number: string
  purchase_date: string | null
  warranty_expiry: string | null
  location: string | null
  status: 'active' | 'operational' | 'maintenance' | 'needs_maintenance' | 'under_repair' | 'decommissioned'
  created_at: string
}

export interface DeviceHealthLog {
  id: string
  device_id: string
  logged_at: string
  error_codes: string[] | null
  usage_hours: number | null
  print_count: number | null
  scan_count: number | null
  paper_jams: number | null
  toner_level: number | null
  drum_condition: number | null
  notes: string | null
}

export interface AIPrediction {
  id: string
  device_id: string
  predicted_issue: string
  confidence_score: number | null
  predicted_failure_date: string | null
  recommended_action: string | null
  is_acknowledged: boolean
  acknowledged_by: string | null
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  device_id: string
  user_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface Task {
  id: string
  request_id: string | null
  prediction_id: string | null
  device_id: string
  assigned_to: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface TaskReport {
  id: string
  task_id: string
  technician_id: string
  device_status: 'working' | 'needs_repair' | 'unrepairable'
  work_performed: string
  diagnosis: string | null
  recommendations: string | null
  time_spent_minutes: number | null
  created_at: string
}

export interface InventoryItem {
  id: string
  part_name: string
  part_number: string
  category: string
  compatible_devices: string[] | null
  quantity: number
  min_quantity: number
  unit_cost: number | null
  location: string | null
  created_at: string
}

export interface PartUsed {
  id: string
  report_id: string
  inventory_item_id: string
  quantity_used: number
}

export interface PartRequest {
  id: string
  task_id: string
  technician_id: string
  inventory_item_id: string
  quantity_requested: number
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  notes: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface TaskWithDetails extends Task {
  device?: Device
  assignee?: Profile
  request?: MaintenanceRequest
  prediction?: AIPrediction
  reports?: TaskReport[]
}

export interface DeviceWithHealth extends Device {
  health_logs?: DeviceHealthLog[]
  predictions?: AIPrediction[]
  owner?: Profile
}
