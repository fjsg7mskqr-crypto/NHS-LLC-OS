import type { SupabaseClient } from '@supabase/supabase-js'
import { getActiveClockSession, getBillableSummary, getHoursSummary } from './time'
import { listOpenTasks } from './tasks'
import { getSchedule } from './calendar'

export async function getStatsSnapshot(supabase: SupabaseClient) {
  const [hours, billable, jobsRes, invoicesRes, squareInvoicesRes] = await Promise.all([
    getHoursSummary(supabase, { period: 'week' }),
    getBillableSummary(supabase, { period: 'month' }),
    supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .in('status', ['scheduled', 'in_progress']),
    supabase
      .from('invoices')
      .select('total')
      .is('deleted_at', null)
      .in('status', ['sent', 'overdue']),
    supabase
      .from('square_invoices')
      .select('amount_due')
      .in('status', ['unpaid', 'overdue', 'partially_paid']),
  ])

  if (jobsRes.error) {
    throw new Error(jobsRes.error.message)
  }
  if (invoicesRes.error) {
    throw new Error(invoicesRes.error.message)
  }
  if (squareInvoicesRes.error) {
    throw new Error(squareInvoicesRes.error.message)
  }

  const manualOutstanding = (invoicesRes.data || []).reduce(
    (sum, invoice) => sum + Number(invoice.total || 0),
    0
  )
  const squareOutstanding = (squareInvoicesRes.data || []).reduce(
    (sum, invoice) => sum + Number(invoice.amount_due || 0),
    0
  )
  const invoicesOutstanding = manualOutstanding + squareOutstanding

  return {
    activeJobs: jobsRes.count ?? 0,
    hoursThisWeek: Math.round((hours.minutes / 60) * 10) / 10,
    billableMTD: billable.amount,
    invoicesOutstanding,
  }
}

export async function getStatusSnapshot(supabase: SupabaseClient) {
  const [activeSession, openTasks, schedule, billable, hours] = await Promise.all([
    getActiveClockSession(supabase),
    listOpenTasks(supabase, 5),
    getSchedule(supabase),
    getBillableSummary(supabase, { period: 'month' }),
    getHoursSummary(supabase, { period: 'week' }),
  ])

  return {
    activeSession,
    openTasks,
    todayBlocks: schedule.blocks,
    billableMonthToDate: billable,
    hoursThisWeek: hours,
  }
}
