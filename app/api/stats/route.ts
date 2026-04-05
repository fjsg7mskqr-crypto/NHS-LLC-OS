import { createServerClient } from '@/lib/supabase-server'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

export async function GET() {
  const supabase = createServerClient()
  const now = new Date()

  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const [jobsRes, weekEntriesRes, monthEntriesRes, invoicesRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .in('status', ['scheduled', 'in_progress']),
    supabase
      .from('time_entries')
      .select('duration_minutes')
      .gte('start_time', `${weekStart}T00:00:00`)
      .lte('start_time', `${weekEnd}T23:59:59`),
    supabase
      .from('time_entries')
      .select('billable_amount')
      .gte('start_time', `${monthStart}T00:00:00`)
      .lte('start_time', `${monthEnd}T23:59:59`)
      .eq('billable', true),
    supabase
      .from('square_invoices')
      .select('amount_due')
      .in('status', ['unpaid', 'overdue', 'draft']),
  ])

  const hoursThisWeek = (weekEntriesRes.data || []).reduce(
    (sum, e) => sum + (e.duration_minutes || 0), 0
  ) / 60

  const billableMTD = (monthEntriesRes.data || []).reduce(
    (sum, e) => sum + (e.billable_amount || 0), 0
  )

  const squareUnpaid = (invoicesRes.data || []).reduce(
    (sum, i) => sum + (i.amount_due || 0), 0
  )

  return Response.json({
    activeJobs: jobsRes.count ?? 0,
    hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    billableMTD,
    squareUnpaid,
  })
}
