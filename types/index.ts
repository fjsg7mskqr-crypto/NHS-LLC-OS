export type CategoryType = 'client_work' | 'drive_time' | 'errand' | 'prep' | 'admin' | 'equipment_maint'
export type JobStatus = 'scheduled' | 'in_progress' | 'active' | 'complete' | 'cancelled'
export type Priority = 'high' | 'medium' | 'low'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type CalendarBlockType = 'sbr_booking' | 'job_day'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  default_hourly_rate: number
  notes?: string
  created_at: string
  deleted_at?: string
}

export interface Property {
  id: string
  client_id: string
  name: string
  address?: string
  type: 'residential' | 'commercial' | 'vacation_rental' | 'other'
  notes?: string
  client?: Client
}

export interface Job {
  id: string
  client_id: string
  property_id?: string
  title: string
  description?: string
  status: JobStatus
  hourly_rate?: number
  target_rate?: number
  square_invoice_id?: string
  created_at: string
  completed_at?: string
  deleted_at?: string
  client?: Client
  property?: Property
  time_entries?: TimeEntry[]
}

export interface TimeEntry {
  id: string
  job_id?: string
  client_id?: string
  property_id?: string
  category: CategoryType
  start_time: string
  end_time?: string
  duration_minutes?: number
  billable: boolean
  hourly_rate?: number
  billable_amount?: number
  notes?: string
  source?: string
  created_at: string
  job?: Job
  client?: Client
  property?: Property
}

export interface Task {
  id: string
  job_id?: string
  client_id?: string
  title: string
  priority: Priority
  due_date?: string
  completed: boolean
  completed_at?: string
  deleted_at?: string
  job?: Job
  client?: Client
}

export interface Equipment {
  id: string
  name: string
  type?: string
  location: 'home_base' | 'den' | 'lodge' | 'in_truck' | 'other'
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair'
  notes?: string
}

export interface CalendarBlock {
  id: string
  property_id: string
  start_date: string
  end_date: string
  type: CalendarBlockType
  notes?: string
  property?: Property
}


export interface Invoice {
  id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  notes?: string
  square_invoice_id?: string
  subtotal: number
  tax: number
  total: number
  created_at: string
  updated_at: string
  deleted_at?: string
  client?: Client
  line_items?: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export interface ClockSession {
  startTime: string
  jobId: string
  clientId: string
  category: CategoryType
}
