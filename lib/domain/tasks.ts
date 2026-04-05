import type { SupabaseClient } from '@supabase/supabase-js'
import type { Priority } from '@/types'

export const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low']

export type CreateTaskInput = {
  title: string
  priority?: Priority
  due_date?: string | null
  client_id?: string | null
  property_id?: string | null
  job_id?: string | null
}

export async function createTask(supabase: SupabaseClient, input: CreateTaskInput) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      priority: input.priority || 'medium',
      due_date: input.due_date || null,
      client_id: input.client_id || null,
      property_id: input.property_id || null,
      job_id: input.job_id || null,
      completed: false,
    })
    .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function listOpenTasks(supabase: SupabaseClient, limit = 10) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
    .is('deleted_at', null)
    .eq('completed', false)
    .order('priority')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function findTaskForCompletion(
  supabase: SupabaseClient,
  input: { task_id?: string; title?: string }
) {
  if (input.task_id) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
      .eq('id', input.task_id)
      .is('deleted_at', null)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  const title = input.title?.trim()
  if (!title) {
    throw new Error('task_id or title is required')
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
    .is('deleted_at', null)
    .eq('completed', false)
    .ilike('title', `%${title}%`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5)

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    throw new Error(`No open task matched "${title}"`)
  }

  if (data.length > 1) {
    throw new Error(`Multiple tasks matched "${title}". Use a more specific title.`)
  }

  return data[0]
}

export async function completeTask(
  supabase: SupabaseClient,
  input: { task_id?: string; title?: string }
) {
  const task = await findTaskForCompletion(supabase, input)

  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .is('deleted_at', null)
    .select(`*, client:clients(id, name), job:jobs(id, title), property:properties(id, name)`)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
