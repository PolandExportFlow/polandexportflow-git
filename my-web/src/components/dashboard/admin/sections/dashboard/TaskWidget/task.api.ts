// app/admin/components/sections/TaskWidget/tasks.api.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import type { AdminTask, NewTask, TaskStatus } from './tasksTypes'

const nn = (v: unknown) => (v === undefined || v === null ? null : String(v).trim() || null)
const s  = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())

export async function getTasks(): Promise<AdminTask[]> {
  const { data, error } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminTask[]
}

export async function createTask(payload: NewTask): Promise<AdminTask> {
  const { data, error } = await supabase
    .from('admin_tasks')
    .insert({
      task_name: s(payload.task_name),
      task_description: nn(payload.task_description),
      task_type: payload.task_type,
      task_status: 'todo' as TaskStatus,
      related_order_id: nn(payload.related_order_id),
    })
    .select('*')
    .single()
  if (error) throw error
  return data as AdminTask
}

export async function updateTask(
  id: string,
  patch: Partial<NewTask> & { task_status?: TaskStatus }
): Promise<AdminTask> {
  const body: Record<string, any> = {}
  if (patch.task_name !== undefined) body.task_name = s(patch.task_name)
  if (patch.task_description !== undefined) body.task_description = nn(patch.task_description)
  if (patch.task_type !== undefined) body.task_type = patch.task_type
  if (patch.task_status !== undefined) body.task_status = patch.task_status
  if (patch.related_order_id !== undefined) body.related_order_id = nn(patch.related_order_id)

  const { data, error } = await supabase
    .from('admin_tasks')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as AdminTask
}

export async function removeTask(id: string): Promise<void> {
  const { error } = await supabase.from('admin_tasks').delete().eq('id', id)
  if (error) throw error
}
