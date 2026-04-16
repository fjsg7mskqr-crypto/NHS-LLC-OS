import type { SupabaseClient } from '@supabase/supabase-js'
import type { Debrief, DebriefContext } from '@/types'
import { dayStartUTC, dayEndUTC, TZ } from '@/lib/timezone'

export type UpsertDebriefInput = {
  date?: string
  summary?: string | null
  wins?: string | null
  blockers?: string | null
  followups?: string | null
  append?: boolean
}

const FIELDS: Array<keyof Pick<UpsertDebriefInput, 'summary' | 'wins' | 'blockers' | 'followups'>> = [
  'summary',
  'wins',
  'blockers',
  'followups',
]

function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

export async function getDebrief(supabase: SupabaseClient, date?: string) {
  const target = date || todayLocal()
  const { data, error } = await supabase
    .from('debriefs')
    .select('*')
    .eq('date', target)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as Debrief | null) || null
}

export async function getDebriefsInRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('debriefs')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as Debrief[]) || []
}

export async function upsertDebrief(
  supabase: SupabaseClient,
  input: UpsertDebriefInput
): Promise<Debrief> {
  const date = input.date || todayLocal()
  const existing = await getDebrief(supabase, date)

  // Build the patch — never overwrite a non-null field with null/undefined.
  // In append mode, concatenate provided values onto the existing text.
  const patch: Record<string, string | null> = {}
  for (const field of FIELDS) {
    const incoming = input[field]
    if (incoming === undefined || incoming === null) continue
    const trimmed = String(incoming).trim()
    if (!trimmed) continue

    if (input.append && existing?.[field]) {
      patch[field] = `${existing[field]}\n${trimmed}`
    } else {
      patch[field] = trimmed
    }
  }

  if (existing) {
    if (Object.keys(patch).length === 0) return existing
    const { data, error } = await supabase
      .from('debriefs')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Debrief
  }

  const { data, error } = await supabase
    .from('debriefs')
    .insert({ date, ...patch })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Debrief
}

export async function getDebriefContext(
  supabase: SupabaseClient,
  date?: string
): Promise<DebriefContext> {
  const target = date || todayLocal()

  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes, billable, billable_amount, client:clients(id, name)')
    .gte('start_time', dayStartUTC(target))
    .lte('start_time', dayEndUTC(target))

  if (error) throw new Error(error.message)

  const entries = ((data as unknown) as Array<{
    duration_minutes: number | null
    billable: boolean
    billable_amount: number | null
    client: { id: string; name: string } | { id: string; name: string }[] | null
  }>) || []

  const clientsMap = new Map<string, { id: string; name: string }>()
  let totalMinutes = 0
  let billableMinutes = 0
  let billableAmount = 0

  for (const entry of entries) {
    const minutes = entry.duration_minutes || 0
    totalMinutes += minutes
    if (entry.billable) {
      billableMinutes += minutes
      billableAmount += entry.billable_amount || 0
    }
    const client = Array.isArray(entry.client) ? entry.client[0] : entry.client
    if (client) {
      clientsMap.set(client.id, client)
    }
  }

  return {
    date: target,
    total_minutes: totalMinutes,
    billable_minutes: billableMinutes,
    billable_amount: Math.round(billableAmount * 100) / 100,
    entry_count: entries.length,
    clients: Array.from(clientsMap.values()),
  }
}

export { todayLocal as todayLocalDate }
