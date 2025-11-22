'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import type { AdminTask, NewTask, TaskStatus, TaskType } from './tasksTypes'
import { createTask, getTasks, removeTask, updateTask } from './task.api'

export function useTasks() {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const booted = useRef(false)

  useEffect(() => {
    if (booted.current) return
    booted.current = true

    ;(async () => {
      try {
        const data = await getTasks()
        setTasks(data)
      } catch (e) {
        logSbError('[useTasks.init.getTasks]', e)
      } finally {
        setLoading(false)
      }
    })()

    const ch = supabase
      .channel('admin_tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_tasks' },
        payload => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as AdminTask
            setTasks(prev => (prev.some(t => t.id === row.id) ? prev : [row, ...prev]))
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as AdminTask
            setTasks(prev => prev.map(t => (t.id === row.id ? row : t)))
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id: string }
            setTasks(prev => prev.filter(t => t.id !== row.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  const add = async (payload: NewTask): Promise<void> => {
    try {
      const created = await createTask(payload)
      setTasks(prev => (prev.some(t => t.id === created.id) ? prev : [created, ...prev]))
    } catch (e) {
      logSbError('[useTasks.add]', e)
      throw e
    }
  }

  const edit = async (id: string, patch: Partial<NewTask>): Promise<void> => {
    const before = tasks
    setTasks(prev => prev.map(t => (t.id === id ? ({ ...t, ...patch } as AdminTask) : t)))
    try {
      const saved = await updateTask(id, patch)
      setTasks(prev => prev.map(t => (t.id === id ? saved : t)))
    } catch (e) {
      setTasks(before)
      logSbError('[useTasks.edit]', e)
      throw e
    }
  }

  const setStatus = async (id: string, task_status: TaskStatus): Promise<void> => {
    const before = tasks
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, task_status } : t)))
    try {
      const saved = await updateTask(id, { task_status })
      setTasks(prev => prev.map(t => (t.id === id ? saved : t)))
    } catch (e) {
      setTasks(before)
      logSbError('[useTasks.setStatus]', e)
      throw e
    }
  }

  const complete = (id: string) => setStatus(id, 'completed')
  const restore = (id: string) => setStatus(id, 'todo')

  const move = async (
    id: string,
    next: { task_type?: TaskType; task_status?: TaskStatus }
  ): Promise<void> => {
    const before = tasks
    setTasks(prev => prev.map(t => (t.id === id ? ({ ...t, ...next } as AdminTask) : t)))
    try {
      const saved = await updateTask(id, next)
      setTasks(prev => prev.map(t => (t.id === id ? saved : t)))
    } catch (e) {
      setTasks(before)
      logSbError('[useTasks.move]', e)
      throw e
    }
  }

  const remove = async (id: string): Promise<void> => {
    const before = tasks
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await removeTask(id)
    } catch (e) {
      setTasks(before)
      logSbError('[useTasks.remove]', e)
      throw e
    }
  }

  const columns = useMemo(() => {
    const todo = tasks.filter(t => t.task_status === 'todo')
    return {
      paczki: todo.filter(t => t.task_type === 'paczki'),
      finanse: todo.filter(t => t.task_type === 'finanse'),
      klienci: todo.filter(t => t.task_type === 'klienci'),
      completed: tasks.filter(t => t.task_status === 'completed'),
    }
  }, [tasks])

  const counts = useMemo(
    () => ({
      paczki: columns.paczki.length,
      finanse: columns.finanse.length,
      klienci: columns.klienci.length,
      completed: columns.completed.length,
      all: tasks.length,
    }),
    [columns, tasks.length]
  )

  return { tasks, loading, columns, counts, add, edit, complete, restore, move, remove }
}
