'use client'

import React, { useMemo, useState } from 'react'
import { Plus, Edit3, Check, ClipboardList, RotateCcw, Package, DollarSign, Users } from 'lucide-react'
import UniversalAdminCard from '../../../utils/UniversalAdminCard'
import type { AdminTask, NewTask, TaskType } from './tasksTypes'
import AddTaskModal from './AddTaskModal'
import EditTaskModal from './EditTaskModal'
import { useTasks } from './useTasks'
import { SectionId } from '../../../types'

type TaskWidgetProps = { onNavigate?: (section: SectionId) => void }

/** Lokalna mapa ikon i kolorów (bez taskDesign) */
const CAT_ICON: Record<TaskType, React.ComponentType<any>> = {
  paczki: Package,
  finanse: DollarSign,
  klienci: Users,
}
const CAT_THEME: Record<TaskType, { bg: string; text: string }> = {
  paczki:  { bg: '#dbeafe', text: '#1e40af' },
  finanse: { bg: '#d1fae5', text: '#065f46' },
  klienci: { bg: '#fef3c7', text: '#92400e' },
}

/** Czas względny */
const timeAgo = (iso?: string | null) => {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3_600_000)
  const days = Math.floor(h / 24)
  if (days > 0) return `${days}d temu`
  if (h > 0) return `${h}h temu`
  const m = Math.floor((d % 3_600_000) / 60_000)
  if (m > 0) return `${m}m temu`
  return 'właśnie'
}

/** Sort: TODO na górze, potem completed; nowsze wyżej */
const sortTasks = (arr: AdminTask[]) =>
  [...arr].sort((a, b) => {
    if (a.task_status !== b.task_status) return a.task_status === 'todo' ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

/** Zebra per kategoria */
const ZEBRA_BG: Record<TaskType, { even: string; odd: string }> = {
  paczki:  { even: '#f3f8ff', odd: '#ffffff' },
  finanse: { even: '#eefcf6', odd: '#ffffff' },
  klienci: { even: '#fff8ec', odd: '#ffffff' },
}

function Row({
  task,
  idx,
  onComplete,
  onRestore,
  onEdit,
}: {
  task: AdminTask
  idx: number
  onComplete: (id: string) => void
  onRestore: (id: string) => void
  onEdit: (t: AdminTask) => void
}) {
  const BoxIcon = CAT_ICON[task.task_type]
  const theme = CAT_THEME[task.task_type]
  const isDone = task.task_status === 'completed'
  const zebra = idx % 2 === 0 ? ZEBRA_BG[task.task_type].even : ZEBRA_BG[task.task_type].odd

  return (
    <li
      className={[
        'group/row px-3 py-3.5 text-middle-blue',
        isDone ? 'opacity-55 filter grayscale' : '',
      ].join(' ')}
      style={{ backgroundColor: zebra }}
    >
      <div className='flex items-center gap-3 py-3 px-2'>
        <span
          className='inline-flex items-center justify-center rounded-md p-2 flex-shrink-0 transition-opacity border'
          style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.text }}
          title={task.task_type}
        >
          <BoxIcon className='h-4 w-4' />
        </span>

        <div className='flex-1 min-w-0 flex flex-col gap-1.5'>
          <h4
            className={[
              'font-heebo_medium text-[13px] tracking-wide truncate leading-tight',
              isDone ? 'line-through decoration-1 decoration-middle-blue/40' : '',
            ].join(' ')}
          >
            {task.task_name}
          </h4>
          <div
            className={['text-xs truncate leading-snug', isDone ? 'opacity-60 italic' : 'opacity-70'].join(' ')}
            title={(task.task_description || '—') + ' · ' + timeAgo(task.created_at)}
          >
            {(task.task_description || '—') + ' · ' + timeAgo(task.created_at)}
          </div>
        </div>

        <div
          className='flex items-center gap-1 flex-shrink-0 ml-1
                     opacity-0 invisible pointer-events-none
                     transition-opacity duration-150
                     group-hover/row:opacity-100 group-hover/row:visible group-hover/row:pointer-events-auto'
        >
          {isDone ? (
            <button
              onClick={() => onRestore(task.id)}
              className='p-2 rounded-lg text-middle-blue hover:bg-middle-blue/10 transition-colors'
              title='Przywróć do TODO'
            >
              <RotateCcw className='h-4 w-4' />
            </button>
          ) : (
            <button
              onClick={() => onComplete(task.id)}
              className='p-2 rounded-lg text-emerald-600 hover:bg-emerald-100/40 transition-colors'
              title='Oznacz jako zrobione'
            >
              <Check className='h-4 w-4' />
            </button>
          )}

          <button
            onClick={() => onEdit(task)}
            className='p-2 rounded-lg text-middle-blue hover:bg-middle-blue/10 transition-colors'
            title='Edytuj'
          >
            <Edit3 className='h-4 w-4' />
          </button>

          {task.related_order_id && (
            <button
              onClick={() => console.log('Przejdź do ordera', task.related_order_id)}
              className='p-2 rounded-lg text-middle-blue hover:bg-middle-blue/10 transition-colors'
              title='Przejdź do zamówienia'
            >
              <ClipboardList className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function Column({
  headingIcon,
  items,
  typeForAdd,
  onAddClick,
  onComplete,
  onRestore,
  onEdit,
}: {
  headingIcon: React.ComponentType<any>
  items: AdminTask[]
  typeForAdd: TaskType
  onAddClick: (presetType: TaskType) => void
  onComplete: (id: string) => void
  onRestore: (id: string) => void
  onEdit: (t: AdminTask) => void
}) {
  const Icon = headingIcon
  return (
    <div className='flex flex-col gap-2 min-h-0'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-middle-blue'>
          <span className='flex h-4 w-4 items-center justify-center'>
            <Icon className='block h-4 w-4' aria-hidden='true' />
          </span>
          <span className='inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-made_regular bg-middle-blue/5 text-middle-blue/70 border border-middle-blue/10'>
            {items.length}
          </span>
        </div>

        <button
          onClick={() => onAddClick(typeForAdd)}
          className='inline-flex items-center justify-center px-4 py-2 mr-1 text-[12px] text-middle-blue border border-middle-blue/20 rounded-md bg-white hover:bg-middle-blue/5 transition-colors'
          title='Dodaj zadanie'
        >
          <Plus className='block h-4 w-4 mr-1' />
          Add New
        </button>
      </div>

      {/* LISTA z ramką i separatorami */}
      <div className='rounded-lg border border-middle-blue/25 overflow-hidden'>
        {items.length === 0 ? (
          <div className='p-6 text-center text-middle-blue/50'>Brak</div>
        ) : (
          <ul className='divide-y divide-middle-blue/15 max-h-[560px] overflow-y-auto custom-scroll overscroll-contain'>
            {items.map((t, idx) => (
              <Row
                key={t.id}
                task={t}
                idx={idx}
                onComplete={onComplete}
                onRestore={onRestore}
                onEdit={onEdit}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function TaskWidget({ onNavigate }: TaskWidgetProps) {
  const { tasks, add, edit, complete, restore } = useTasks()

  const [addOpen, setAddOpen] = useState(false)
  const [addPresetType, setAddPresetType] = useState<TaskType>('paczki')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AdminTask | null>(null)

  const paczki  = useMemo(() => sortTasks(tasks.filter(t => t.task_type === 'paczki')), [tasks])
  const finanse = useMemo(() => sortTasks(tasks.filter(t => t.task_type === 'finanse')), [tasks])
  const klienci = useMemo(() => sortTasks(tasks.filter(t => t.task_type === 'klienci')), [tasks])

  const handleComplete = async (id: string) => { await complete(id) }
  const handleRestore  = async (id: string) => { await restore(id) }
  const handleEdit     = (t: AdminTask) => { setEditing(t); setEditOpen(true) }
  const handleAddClick = (presetType: TaskType) => { setAddPresetType(presetType); setAddOpen(true) }

  const handleSubmitAdd = async (data: NewTask) => { await add(data); setAddOpen(false) }
  const handleSubmitEdit = async (data: NewTask) => {
    if (!editing) return
    await edit(editing.id, data)
    setEditing(null)
    setEditOpen(false)
  }

  return (
    <UniversalAdminCard className='mb-10'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0'>
        <Column
          headingIcon={CAT_ICON.paczki}
          items={paczki}
          typeForAdd='paczki'
          onAddClick={handleAddClick}
          onComplete={handleComplete}
          onRestore={handleRestore}
          onEdit={handleEdit}
        />
        <Column
          headingIcon={CAT_ICON.finanse}
          items={finanse}
          typeForAdd='finanse'
          onAddClick={handleAddClick}
          onComplete={handleComplete}
          onRestore={handleRestore}
          onEdit={handleEdit}
        />
        <Column
          headingIcon={CAT_ICON.klienci}
          items={klienci}
          typeForAdd='klienci'
          onAddClick={handleAddClick}
          onComplete={handleComplete}
          onRestore={handleRestore}
          onEdit={handleEdit}
        />
      </div>

      <AddTaskModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        defaultType={addPresetType}
        onSubmit={handleSubmitAdd}
      />
      <EditTaskModal
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); setEditing(null) }}
        task={editing}
        onSubmit={handleSubmitEdit}
      />
    </UniversalAdminCard>
  )
}
