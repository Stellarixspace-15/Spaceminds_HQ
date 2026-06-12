export type Role = 'admin' | 'founder' | 'trainer' | 'admin_staff'

export interface AllowedUser {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface SopStep {
  step: number
  name: string
}

export interface Program {
  id: string
  name: string
  sheet_tab_name: string
  color: string
  sop_steps: SopStep[]
  is_active: boolean
}

export interface School {
  id: string
  school_id: string
  school_name: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  city?: string
  program_id?: string
  program_type?: string
  enrollment_count: number
  pipeline_step: number
  pipeline_status: 'In Progress' | 'Completed' | 'Blocked' | 'Not Started'
  assigned_trainer?: string
  outreach_date?: string
  workshop_date?: string
  curriculum_start?: string
  notes?: string
  status: 'Active' | 'On Hold' | 'Completed'
  last_synced_at: string
  sheet_row_index?: number
  created_at: string
  updated_at: string
  programs?: Program
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  target_role?: string
  is_sticky: boolean
  is_active: boolean
  created_by: string
  created_at: string
}

export const ROLE_COLORS: Record<Role, string> = {
  admin: '#ef4444',
  founder: '#6366f1',
  trainer: '#10b981',
  admin_staff: '#f59e0b',
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  founder: 'Founder',
  trainer: 'Trainer',
  admin_staff: 'Admin Staff',
}

export const SHEET_COLUMNS = [
  'school_id','school_name','contact_name','contact_email','contact_phone',
  'city','program_type','enrollment_count','pipeline_step','pipeline_status',
  'assigned_trainer','outreach_date','workshop_date','curriculum_start',
  'notes','last_updated','status'
] as const
