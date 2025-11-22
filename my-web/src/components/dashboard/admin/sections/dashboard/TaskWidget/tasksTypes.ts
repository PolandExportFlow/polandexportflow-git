// app/admin/components/sections/TaskWidget/tasksTypes.ts
export type TaskType = 'paczki' | 'finanse' | 'klienci'
export type TaskStatus = 'todo' | 'completed'

export type AdminTask = {
  id: string
  task_name: string
  task_description: string | null
  task_type: TaskType
  task_status: TaskStatus
  related_order_id: string | null
  created_at: string
  updated_at: string | null
  completed_at: string | null
}

export type NewTask = {
  task_name: string
  task_description?: string | null
  task_type: TaskType
  related_order_id?: string | null
}
