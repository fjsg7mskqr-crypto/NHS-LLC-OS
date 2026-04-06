import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeValue(value: string) {
  return value.trim()
}

async function resolveSingleByIdOrName(
  supabase: SupabaseClient,
  table: 'clients' | 'properties' | 'jobs' | 'tasks',
  label: string,
  value: string,
  select: string
) {
  const normalized = normalizeValue(value)
  const byId = UUID_PATTERN.test(normalized)

  let query = supabase
    .from(table)
    .select(select)
    .limit(5)

  if (table !== 'properties') {
    query = query.is('deleted_at', null)
  }

  if (table === 'tasks') {
    query = query.eq('completed', false)
  }

  if (byId) {
    query = query.eq('id', normalized)
  } else {
    const field = table === 'jobs' || table === 'tasks' ? 'title' : 'name'
    query = query.ilike(field, `%${normalized}%`)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    throw new Error(`No ${label} matched "${value}"`)
  }

  if (data.length > 1) {
    const field = table === 'jobs' || table === 'tasks' ? 'title' : 'name'
    const names = data.slice(0, 5).map((row: unknown) => {
      const r = row as Record<string, unknown>
      return String(r[field] || r.id)
    })
    throw new Error(`Multiple ${label}s matched "${value}": ${names.join(', ')}. Be more specific.`)
  }

  return data[0] as unknown as { id: string }
}

export async function resolveClientId(supabase: SupabaseClient, value?: string | null) {
  if (!value) return null
  const client = await resolveSingleByIdOrName(
    supabase,
    'clients',
    'client',
    value,
    'id, name'
  )
  return client.id as string
}

export async function resolvePropertyId(supabase: SupabaseClient, value?: string | null) {
  if (!value) return null
  const property = await resolveSingleByIdOrName(
    supabase,
    'properties',
    'property',
    value,
    'id, name, client_id'
  )
  return property.id as string
}

export async function resolveJobId(supabase: SupabaseClient, value?: string | null) {
  if (!value) return null
  const job = await resolveSingleByIdOrName(
    supabase,
    'jobs',
    'job',
    value,
    'id, title, client_id, property_id'
  )
  return job.id as string
}

export async function resolveTaskId(supabase: SupabaseClient, value?: string | null) {
  if (!value) return null
  const task = await resolveSingleByIdOrName(
    supabase,
    'tasks',
    'task',
    value,
    'id, title'
  )
  return task.id as string
}
