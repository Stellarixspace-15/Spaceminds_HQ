export type Role = 'admin' | 'founder' | 'trainer' | 'admin_staff'

export interface AllowedUser {
  id: string; email: string; full_name: string; role: Role
  is_active: boolean; created_by?: string; created_at: string
}
export interface SopStep { step: number; name: string }
export interface Program {
  id: string; name: string; sheet_tab_name: string; color: string
  sop_steps: SopStep[]; is_active: boolean
}
export interface School {
  id: string; school_id: string; school_name: string
  contact_name?: string; contact_email?: string; contact_phone?: string
  city?: string; category?: string; program_id?: string; program_type?: string
  enrollment_count: number; pipeline_step: number
  pipeline_status: 'In Progress' | 'Completed' | 'Blocked' | 'Not Started'
  assigned_trainer?: string; outreach_date?: string; workshop_date?: string
  curriculum_start?: string; notes?: string
  status: 'Active' | 'On Hold' | 'Completed'
  last_synced_at: string; sheet_row_index?: number
  created_at: string; updated_at: string; programs?: Program
}
export interface Course {
  id: string; name: string; course_fee: number; kit_fee: number
  billing_type: 'monthly' | 'one_time'; is_active: boolean
}
export interface Student {
  id: string; student_id: string; student_name: string
  student_phone?: string; student_email?: string
  parent_name?: string; parent_phone?: string
  course?: string; venue?: string; enrollment_date?: string
  payment_status: 'Paid' | 'Pending' | 'Partial' | 'Overdue'
  amount_paid: number; kit_fee_paid: boolean
  payment_date?: string; payment_month?: string; notes?: string
  status: 'Active' | 'Dropped' | 'Completed'
  sheet_row_index?: number; created_at: string; updated_at: string
}
export interface Payment {
  id: string; student_id: string; month: string; course_name?: string
  course_fee: number; kit_fee: number; total: number
  paid_at: string; recorded_by?: string; created_at: string
}
export interface VenueCategory { id: string; name: string; is_active: boolean }
export interface VenueAssignment {
  id: string; school_id: string; trainer_email: string
  assigned_by?: string; created_at: string; schools?: School
}
export interface Notification {
  id: string; title: string; message: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_sticky: boolean; is_active: boolean; created_by: string; created_at: string
}

export const ROLE_COLORS: Record<Role, string> = {
  admin: '#ef4444', founder: '#6366f1', trainer: '#10b981', admin_staff: '#f59e0b',
}
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', founder: 'Founder', trainer: 'Trainer', admin_staff: 'Admin Staff',
}

export const PROGRAM_COLUMNS = [
  'school_id','school_name','contact_name','contact_email','contact_phone',
  'city','program_type','enrollment_count','pipeline_step','pipeline_status',
  'assigned_trainer','outreach_date','workshop_date','curriculum_start',
  'notes','last_updated','status','category'
] as const

export const STUDENT_COLUMNS = [
  'student_id','student_name','student_phone','student_email',
  'parent_name','parent_phone','course','venue','enrollment_date',
  'payment_status','amount_paid','kit_fee_paid','payment_date',
  'payment_month','notes','last_updated','status'
] as const

export const STUDENTS_TAB = 'Regular Classes'

export const DEFAULT_SOP: SopStep[] = [
  {step:1,name:'Initial Outreach'},{step:2,name:'Interest Confirmed'},
  {step:3,name:'Meeting Scheduled'},{step:4,name:'Meeting Done'},
  {step:5,name:'Proposal Sent'},{step:6,name:'Proposal Approved'},
  {step:7,name:'Agreement Signed'},{step:8,name:'Trainer Assigned'},
  {step:9,name:'Session Scheduled'},{step:10,name:'Session Delivered'},
  {step:11,name:'Feedback Collected'},{step:12,name:'Program Completed'},
]
export const PROGRAM_PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#84cc16']
