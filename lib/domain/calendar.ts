import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalendarBlockType } from '@/types'

export const VALID_BLOCK_TYPES: CalendarBlockType[] = ['booking', 'job_day', 'sbr_booking', 'unavailable']

export type CreateCalendarBlockInput = {
  property_id?: string | null
  type?: CalendarBlockType
  start_date: string
  end_date: string
  notes?: string | null
  source?: string
}

export async function createCalendarBlock(supabase: SupabaseClient, input: CreateCalendarBlockInput) {
  const { data, error } = await supabase
    .from('calendar_blocks')
    .insert({
      property_id: input.property_id || null,
      type: input.type || 'job_day',
      start_date: input.start_date,
      end_date: input.end_date,
      notes: input.notes || null,
      source: input.source || 'assistant',
    })
    .select(`*, property:properties(id, name, client_id, client:clients(id, name))`)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getSchedule(
  supabase: SupabaseClient,
  input?: { start_date?: string; end_date?: string }
) {
  const startDate = input?.start_date || new Date().toISOString().slice(0, 10)
  const endDate = input?.end_date || startDate

  const { data, error } = await supabase
    .from('calendar_blocks')
    .select(`*, property:properties(id, name, client_id, client:clients(id, name))`)
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    start_date: startDate,
    end_date: endDate,
    blocks: data || [],
  }
}
