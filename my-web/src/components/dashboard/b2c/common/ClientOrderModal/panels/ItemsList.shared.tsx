'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { ItemsPanelRowDB as Item, ClientFile as ImageRef } from '../clientOrderTypes'

/* === STYL BAZOWY + WARIANT ALT (scopowana grupa: group/row) === */
const BOX_BASE =
  [
    'inline-flex w-full h-12 items-center justify-between gap-2 rounded-md',
    'px-3 py-2 leading-none align-middle',
    'border transition-colors duration-200',
    'select-none',
    // border
    'border-middle-blue/10',
    'group-data-[alt=true]/row:border-middle-blue/20',
    // background
    'bg-ds-light-blue',
    'group-data-[alt=true]/row:!bg-white',
    // hover
    'hover:bg-middle-blue/6',
    'group-data-[alt=true]/row:hover:!bg-middle-blue/6',
  ].join(' ')

/* === UTILS === */
export const parseLocalizedNumber = (input: unknown): number | null => {
  if (input == null || input === '') return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  let s = String(input).trim().replace(/\s|\u00A0/g, '')
  const c = s.lastIndexOf(',')
  const d = s.lastIndexOf('.')
  if (c !== -1 && d !== -1) {
    const dec = c > d ? ',' : '.'
    const th = dec === ',' ? '.' : ','
    s = s.replace(new RegExp('\\' + th, 'g'), '').replace(dec, '.')
  } else if (c !== -1) {
    s = s.replace(/,/g, '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const parseNumber = (v: string) => parseLocalizedNumber(v) ?? 0
export const strNumber = (n?: number | null) => (isFiniteNum(n) ? String(n) : '')
export const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
export const safeHttp = (url?: string | null) =>
  !url ? '#' : /^https?:\/\//i.test(url) ? url : `https://${url}`

/* === Dims/quantity helpers === */
export function normalizeDimsFromItem(i?: Partial<Item> | null) {
  const toNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    width_cm: toNum(i?.item_width),
    height_cm: toNum(i?.item_height),
    length_cm: toNum(i?.item_length),
  }
}
export function getQty(i?: Partial<Item> | null): number {
  const n = Number(i?.item_quantity ?? 1)
  return Number.isFinite(n) ? Math.max(1, Math.round(n)) : 1
}
export function getUnitValuePLN(i?: Partial<Item> | null): number {
  const n = Number(i?.item_value ?? 0)
  return Number.isFinite(n) ? n : 0
}
export function getWeightKg(i?: Partial<Item> | null): number | null {
  const w = i?.item_weight
  return typeof w === 'number' && Number.isFinite(w) ? w : null
}

/* === EditableBox === */
export function EditableBox({
  label,
  icon,
  value,
  placeholder,
  mode = 'text', // 'text' | 'number' | 'textarea'
  suffix,
  onCommit,
  className = '',
  after,
  widthPx,
}: {
  label: string
  icon?: React.ReactNode
  value: string
  placeholder?: string
  mode?: 'text' | 'number' | 'textarea'
  suffix?: string
  onCommit: (v: string) => void
  className?: string
  after?: React.ReactNode
  widthPx?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const boxRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const composingRef = useRef(false) // IME guard

  useEffect(() => {
    let t: number | undefined
    if (editing) t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => { if (t !== undefined) window.clearTimeout(t) }
  }, [editing])

  useEffect(() => { if (!editing) setDraft(value ?? '') }, [value, editing])

  useEffect(() => {
    if (!editing) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (boxRef.current && target && !boxRef.current.contains(target)) doCommit()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [editing, draft, value])

  const doCommit = () => {
    setEditing(false)
    const next = (draft ?? '').trim()
    const prev = (value ?? '').trim()
    if (next !== prev) onCommit(next)
  }
  const doCancel  = () => { setDraft(value ?? ''); setEditing(false) }

  const isTextarea = mode === 'textarea'
  const hasValue = Boolean((editing ? draft : value)?.toString().trim())

  // textarea autosize on each change
  useEffect(() => {
    if (!isTextarea || !editing || !inputRef.current) return
    const el = inputRef.current as HTMLTextAreaElement
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 48)}px`
  }, [editing, isTextarea, draft])

  const containerClass = [
    // baza jak BOX_BASE, ale sterujemy kursorem zależnie od trybu
    'inline-flex w-full rounded-md',
    'px-3 transition-colors duration-200',
    'border',
    'items-center gap-2',
    'editing' in (inputRef.current || {}) || editing ? 'cursor-text' : 'cursor-pointer', // fix dla lintera
    isTextarea ? 'min-h-12 py-2' : 'h-12',
    // border
    'border-middle-blue/16',
    'group-data-[alt=true]/row:border-middle-blue/12',
    // tła
    'bg-ds-light-blue',
    'group-data-[alt=true]/row:!bg-white',
    // hover
    'hover:bg-middle-blue/6',
    'group-data-[alt=true]/row:hover:!bg-middle-blue/6',
    className,
  ].join(' ')

  return (
    <div
      ref={boxRef}
      role='button'
      tabIndex={0}
      onClick={() => !editing && setEditing(true)}
      onKeyDown={(e) => { if (!isTextarea && !editing && e.key === 'Enter') setEditing(true) }}
      className={containerClass}
      style={widthPx ? { width: widthPx } : undefined}
      title={`Edit ${label}`}
    >
      <div className='flex items-center gap-2 min-w-0 shrink-0'>
        {icon ? <span className='inline-grid place-items-center h-3.5 w-3.5 text-middle-blue/70'>{icon}</span> : null}
        <span className='text-[13px] text-middle-blue/75 whitespace-nowrap'>{label}:</span>
      </div>

      {isTextarea ? (
        <div className='flex-1 min-w-0'>
          {editing ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') doCancel() }}
              placeholder={placeholder}
              className='w-full resize-y bg-[#F3F6FA] outline-none text-[13.5px] text-middle-blue font-heebo_medium leading-[1.6] px-3 py-2 rounded-md border border-middle-blue/20 focus:border-middle-blue/40 focus:ring-2 focus:ring-middle-blue/15'
            />
          ) : (
            <>
              <span className='block sm:hidden text-[13.5px] font-heebo_medium leading-[1.6] text-middle-blue truncate'>
                {value?.trim() ? value : <span className='opacity-60'>{placeholder || '—'}</span>}
              </span>
              <div className='hidden sm:block text-[13.5px] font-heebo_medium text-middle-blue whitespace-pre-line break-words'>
                {value?.trim() ? value : <span className='opacity-60'>{placeholder || '—'}</span>}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className='flex items-center gap-2 min-w-0 flex-1 justify-start whitespace-nowrap'>
          {editing ? (
            <>
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type='text'
                inputMode={mode === 'number' ? 'decimal' : 'text'}
                enterKeyHint='done'
                value={draft}
                onCompositionStart={() => { composingRef.current = true }}
                onCompositionEnd={() => { composingRef.current = false }}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !composingRef.current) doCommit()
                  if (e.key === 'Escape') doCancel()
                }}
                placeholder={placeholder}
                className='h-9 flex-1 min-w-0 pl-3 pr-1 outline-none bg-[#F3F6FA] text-middle-blue rounded-md border border-middle-blue/20 focus:border-middle-blue/40 focus:ring-2 focus:ring-middle-blue/15'
              />
              {suffix && hasValue ? (
                <span className='text-[12.5px] text-middle-blue/70 whitespace-nowrap ml-1 pl-1'>{suffix}</span>
              ) : null}
              {after ? <div className='ml-1 shrink-0'>{after}</div> : null}
            </>
          ) : (
            <>
              <span className='text-[13.5px] font-heebo_medium leading-[1.6] truncate tracking-wide text-middle-blue'>
                {value?.trim() ? value : <span className='font-heebo_regular opacity-60'>{placeholder || '—'}</span>}
              </span>
              {suffix && hasValue ? (
                <span className='text-[12.5px] text-middle-blue/70 whitespace-nowrap ml-1 pl-1'>{suffix}</span>
              ) : null}
              {after ? <div className='ml-1 shrink-0'>{after}</div> : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* === ActionBox (dziedziczy naprzemienny wygląd) === */
export function ActionBox({
  label,
  icon,
  actionText = 'Add',
  onClick,
  className = '',
  widthPx,
}: {
  label: string
  icon?: React.ReactNode
  actionText?: string
  onClick: () => void
  className?: string
  widthPx?: number
}) {
  const text = `${actionText}${label ? ` ${label}` : ''}`
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className={`${BOX_BASE} ${className} cursor-pointer`}
      style={widthPx ? { width: widthPx } : undefined}
      title={text}
    >
      <div className='flex items-center gap-2 min-w-0'>
        {icon ? <span className='inline-grid place-items-center h-3.5 w-3.5 text-middle-blue/70'>{icon}</span> : null}
        <span className='text-[13px] text-middle-blue/80 whitespace-nowrap'>{text}</span>
      </div>
      <div />
    </div>
  )
}

export type { Item, ImageRef }