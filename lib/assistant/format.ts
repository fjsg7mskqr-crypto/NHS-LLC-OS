import { format } from 'date-fns'

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

export function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return 'unscheduled'
  return format(new Date(value), 'MMM d')
}

export function formatDateTime(value: string) {
  return format(new Date(value), 'MMM d, h:mm a')
}

export function joinList(values: string[]) {
  if (values.length <= 1) return values[0] ?? ''
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}
