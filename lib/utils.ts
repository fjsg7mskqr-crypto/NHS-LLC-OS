import { type CategoryType } from '@/types'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatMinutes(minutes: number): string {
  return formatHours(minutes / 60)
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

export const CATEGORY_COLORS: Record<CategoryType, string> = {
  client_work: '#22c55e',
  drive_time: '#3b82f6',

  prep: '#f59e0b',
  admin: '#6b7280',
  equipment_maint: '#14b8a6',
}

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  client_work: 'Client Work',
  drive_time: 'Drive Time',

  prep: 'Prep',
  admin: 'Admin',
  equipment_maint: 'Equipment Maint.',
}

export const CATEGORY_BG: Record<CategoryType, string> = {
  client_work: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  drive_time: 'bg-blue-500/20 text-blue-400 border-blue-500/30',

  prep: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  equipment_maint: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'in_progress': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'complete': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export function invoiceStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    case 'sent': case 'unpaid': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'partially_paid': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}
