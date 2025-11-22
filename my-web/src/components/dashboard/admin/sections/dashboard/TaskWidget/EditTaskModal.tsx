'use client'

import React, { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import UniversalInput from '@/components/ui/UniwersalInput'
import type { AdminTask, NewTask, TaskType } from './tasksTypes'
import { Edit3, FileText, ClipboardList, DollarSign, Package, Users } from 'lucide-react'

/* === Lokalny mini-design (zamiast taskDesign) === */
const modalNarrow = { size: 'md' as const, panelMaxWidth: 920 as const }
const btnPrimary =
  'inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-middle-blue text-white font-heebo_regular hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition'
const btnSecondary =
  'px-5 py-3 rounded-lg font-heebo_regular text-middle-blue hover:bg-middle-blue/10 hover:opacity-90 transition'

const CAT_THEME: Record<TaskType, { bg: string; text: string; Icon: React.ComponentType<any> }> = {
  paczki:  { bg: '#dbeafe', text: '#1e40af', Icon: Package },
  finanse: { bg: '#d1fae5', text: '#065f46', Icon: DollarSign },
  klienci: { bg: '#fef3c7', text: '#92400e', Icon: Users },
}

function CategoryPill({
  type,
  active,
  onClick,
}: { type: TaskType; active: boolean; onClick: () => void }) {
  const { bg, text, Icon } = CAT_THEME[type]
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md p-2 border transition"
      style={{
        backgroundColor: active ? bg : '#ffffff',
        color: active ? text : '#334155',
        borderColor: active ? text : 'rgba(31,59,130,.15)',
        borderWidth: 1.5,
      }}
      title={type}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
/* === /mini-design === */

type Props = {
  isOpen: boolean
  onClose: () => void
  task: AdminTask | null
  onSubmit: (data: NewTask) => void
}

export default function EditTaskModal({ isOpen, onClose, task, onSubmit }: Props) {
  const [form, setForm] = useState<{
    task_name: string
    task_description: string
    task_type: TaskType
    related_order_id: string | null
  }>({
    task_name: '',
    task_description: '',
    task_type: 'paczki',
    related_order_id: null,
  })

  useEffect(() => {
    if (isOpen && task) {
      setForm({
        task_name: task.task_name,
        task_description: task.task_description ?? '',
        task_type: task.task_type,
        related_order_id: task.related_order_id ?? null,
      })
    }
  }, [isOpen, task])

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...modalNarrow}>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!form.task_name.trim()) return
          const payload: NewTask = {
            task_name: form.task_name,
            task_description: form.task_description,
            task_type: form.task_type,
            related_order_id: (form.related_order_id ?? '').toString().trim() || null,
          }
          onSubmit(payload)
        }}
        className="p-4 sm:p-6 space-y-6"
      >
        <h3>Edytuj zadanie</h3>

        <UniversalInput
          label="Nazwa zadania"
          name="task_name"
          value={form.task_name}
          onChange={v => setForm({ ...form, task_name: v })}
          placeholder="Wpisz nazwę zadania..."
          type="text"
          required
          leftIcon={Edit3}
        />

        <UniversalInput
          label="Opis zadania"
          name="task_description"
          value={form.task_description ?? ''}
          onChange={v => setForm({ ...form, task_description: v })}
          placeholder="Opisz szczegóły zadania..."
          type="textarea"
          leftIcon={FileText}
        />

        <UniversalInput
          label="ID zamówienia (opcjonalnie)"
          name="related_order_id"
          value={form.related_order_id ?? ''}
          onChange={v => setForm({ ...form, related_order_id: v })}
          placeholder="Np. PEF-12345 / dowolny identyfikator"
          type="text"
          leftIcon={ClipboardList}
          helpText="Zostaw puste, jeśli zadanie nie dotyczy konkretnego zamówienia."
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {(['paczki', 'finanse', 'klienci'] as TaskType[]).map(k => (
              <CategoryPill key={k} type={k} active={form.task_type === k} onClick={() => setForm({ ...form, task_type: k })} />
            ))}
          </div>

          <div className="flex gap-2 font-heebo_regular text-sm">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Anuluj
            </button>
            <button type="submit" disabled={!form.task_name.trim()} className={btnPrimary}>
              Zapisz zmiany
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
