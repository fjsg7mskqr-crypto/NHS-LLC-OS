import type { SupabaseClient } from '@supabase/supabase-js'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import type { CategoryType } from '@/types'

export const VALID_CATEGORIES: CategoryType[] = [
  'client_work',
  'drive_time',
  'errand',
  'prep',
  'admin',
  'equipment_maint',
]

export type CreateTimeEntryInput = {
  job_id?: string | null
  client_id?: string | null
  property_id?: string | null
  category: CategoryType
  start_time: string
  end_time: string
  billable?: boolean
  hourly_rate?: number | null
  notes?: string | null
  source?: string
}

export type ActiveClockSession = {
  id: string
  started_at: string
  category: CategoryType
  client_id?: string | null
  job_id?: string | null
  property_id?: string | null
  notes?: string | null
  billable?: boolean
  hourly_rate?: number | null
}

export function buildTimeRangeFromMinutes(minutes: number, end = new Date()) {
  const endTime = new Date(end)
  const startTime = new Date(end.getTime() - minutes * 60_000)

  return {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
  }
}

export async function getClientDefaultRate(supabase: SupabaseClient, clientId?: string | null) {
  if (!clientId) return null
  const { data, error } = await supabase
    .from('clients')
    .select('default_hourly_rate')
    .eq('id', clientId)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data?.default_hourly_rate ?? null
}

export async function createTimeEntry(supabase: SupabaseClient, input: CreateTimeEntryInput) {
  const startTime = new Date(input.start_time)
  const endTime = new Date(input.end_time)
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('end_time must be after start_time')
  }

  const billable = input.billable ?? false
  const rate = billable
    ? (input.hourly_rate ?? await getClientDefaultRate(supabase, input.client_id))
    : null
  const billableAmount = billable && rate
    ? Math.round((durationMinutes / 60) * rate * 100) / 100
    : null

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      job_id: input.job_id || null,
      client_id: input.client_id || null,
      property_id: input.property_id || null,
      category: input.category,
      start_time: input.start_time,
      end_time: input.end_time,
      duration_minutes: durationMinutes,
      billable,
      hourly_rate: rate,
      billable_amount: billableAmount,
      notes: input.notes || null,
      source: input.source || 'assistant',
    })
    .select(`*, job:jobs(id, title), client:clients(id, name), property:properties(id, name)`)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createClockSession(
  supabase: SupabaseClient,
  input: Omit<ActiveClockSession, 'id' | 'started_at'> & { started_at?: string }
) {
  const existing = await getActiveClockSession(supabase)
  if (existing) {
    throw new Error('An active clock session already exists')
  }

  const { data, error } = await supabase
    .from('active_clock_sessions')
    .insert({
      started_at: input.started_at || new Date().toISOString(),
      category: input.category,
      client_id: input.client_id || null,
      job_id: input.job_id || null,
      property_id: input.property_id || null,
      notes: input.notes || null,
      billable: input.billable ?? false,
      hourly_rate: input.hourly_rate ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getActiveClockSession(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('active_clock_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('relation')) {
      return null
    }
    throw new Error(error.message)
  }

  return data as ActiveClockSession | null
}

export async function clockOutActiveSession(
  supabase: SupabaseClient,
  input?: { end_time?: string; notes?: string | null }
) {
  const session = await getActiveClockSession(supabase)
  if (!session) {
    throw new Error('No active clock session found')
  }

  const entry = await createTimeEntry(supabase, {
    job_id: session.job_id,
    client_id: session.client_id,
    property_id: session.property_id,
    category: session.category,
    start_time: session.started_at,
    end_time: input?.end_time || new Date().toISOString(),
    notes: input?.notes || session.notes || null,
    billable: session.billable ?? false,
    hourly_rate: session.hourly_rate ?? null,
    source: 'assistant',
  })

  const { error } = await supabase
    .from('active_clock_sessions')
    .delete()
    .eq('id', session.id)

  if (error) {
    throw new Error(error.message)
  }

  return { session, entry }
}

export async function getHoursSummary(
  supabase: SupabaseClient,
  input?: { start_date?: string; end_date?: string; period?: 'week' | 'month' }
) {
  const period = input?.period || 'week'
  const now = new Date()
  const start = input?.start_date || format(
    period === 'month' ? startOfMonth(now) : startOfWeek(now, { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  )
  const end = input?.end_date || format(
    period === 'month' ? endOfMonth(now) : endOfWeek(now, { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  )

  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes')
    .gte('start_time', `${start}T00:00:00`)
    .lte('start_time', `${end}T23:59:59`)

  if (error) {
    throw new Error(error.message)
  }

  const minutes = (data || []).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)

  return { start_date: start, end_date: end, minutes }
}

export async function getBillableSummary(
  supabase: SupabaseClient,
  input?: { start_date?: string; end_date?: string; period?: 'week' | 'month' }
) {
  const period = input?.period || 'month'
  const now = new Date()
  const start = input?.start_date || format(
    period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now),
    'yyyy-MM-dd'
  )
  const end = input?.end_date || format(
    period === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now),
    'yyyy-MM-dd'
  )

  const { data, error } = await supabase
    .from('time_entries')
    .select('billable_amount, duration_minutes')
    .gte('start_time', `${start}T00:00:00`)
    .lte('start_time', `${end}T23:59:59`)
    .eq('billable', true)

  if (error) {
    throw new Error(error.message)
  }

  const amount = (data || []).reduce((sum, entry) => sum + (entry.billable_amount || 0), 0)
  const minutes = (data || []).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)

  return { start_date: start, end_date: end, amount, minutes }
}
