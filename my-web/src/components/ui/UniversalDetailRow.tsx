'use client'

import React, { KeyboardEvent, useMemo, useRef, useState } from 'react'
import { Check, Copy, Edit3 } from 'lucide-react'

type CopyAction = {
  kind: 'copy'
  text?: string | (() => string)
  label?: string
  onCopied?: () => void
  disabled?: boolean
}
type EditAction = {
  kind: 'edit'
  onClick?: () => void
  label?: string
  disabled?: boolean
}
type CustomAction = {
  kind: 'custom'
  onClick: () => void
  icon: React.ReactNode
  label?: string
  title?: string
  disabled?: boolean
}
export type DetailRowAction = CopyAction | EditAction | CustomAction

export const DetailRow: React.FC<{
  label: string
  value?: React.ReactNode
  valueText?: string
  className?: string
  actions?: DetailRowAction[]
  onValueClick?: () => void
  strongValue?: boolean
  icon?: React.ReactNode
  striped?: boolean
  flushRight?: boolean
  disableRowClick?: boolean
  mutedWhenEmpty?: boolean
}> = ({
  label,
  value = '—',
  valueText,
  className,
  actions,
  onValueClick,
  strongValue,
  icon,
  striped = true,
  flushRight = false,
  disableRowClick = false,
  mutedWhenEmpty = true,
}) => {
  const [copied, setCopied] = useState(false)
  const valueRef = useRef<HTMLDivElement | null>(null)

  const enabledActions = useMemo(() => (actions ?? []).filter(a => !(a as any).disabled), [actions])

  const defaultAction = useMemo(() => {
    return (
      enabledActions.find(a => a.kind === 'edit') ||
      enabledActions.find(a => a.kind === 'copy') ||
      enabledActions[0]
    )
  }, [enabledActions])

  const clickable = !!defaultAction && !disableRowClick
  const hasEdit = !!enabledActions.find(a => a.kind === 'edit')

  const getCopyText = () => {
    const copyAction = enabledActions.find(a => a.kind === 'copy') as CopyAction | undefined
    const fromAction = typeof copyAction?.text === 'function' ? copyAction.text() : copyAction?.text
    const fromValue = valueText ?? (typeof value === 'string' ? value : '')
    return fromAction ?? fromValue ?? ''
  }

  const runCopy = async () => {
    const txt = getCopyText()
    if (!txt) return
    try {
      await navigator.clipboard.writeText(txt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
      ;(enabledActions.find(a => a.kind === 'copy') as CopyAction | undefined)?.onCopied?.()
    } catch {
      /* ignore */
    }
  }

  const triggerEdit = () => {
    const editAction = enabledActions.find(a => a.kind === 'edit') as EditAction | undefined
    if (editAction?.onClick) return editAction.onClick()

    const root = valueRef.current
    if (!root) return
    const editTarget =
      root.querySelector<HTMLElement>('[data-start-edit]') ||
      root.querySelector<HTMLElement>('[data-autofocus]') ||
      root.querySelector<HTMLElement>('input,textarea,button,[contenteditable="true"],[contenteditable=""]')

    if (editTarget) {
      if (editTarget.hasAttribute('data-start-edit')) editTarget.click()
      editTarget.focus()
    }
  }

  const fireDefault = () => {
    if (!defaultAction) return
    if (defaultAction.kind === 'edit') return triggerEdit()
    if (defaultAction.kind === 'copy') return void runCopy()
    if (defaultAction.kind === 'custom') return (defaultAction as CustomAction).onClick()
  }

  const onRowKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!clickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fireDefault()
    }
  }

  // zostawiam Twoją logikę "mutedWhenEmpty" bez zmian
  const isEmpty =
    mutedWhenEmpty &&
    valueText === '' &&
    typeof value === 'string' &&
    value.trim() !== ''
  const valueClasses = [
    'text-[14px] text-right',
    strongValue ? 'font-medium' : '',
    isEmpty ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      onClick={clickable ? fireDefault : undefined}
      onKeyDown={clickable ? onRowKey : undefined}
      className={[
        'group flex items-center justify-between',
        'pl-3 sm:pl-4',
        flushRight ? 'pr-1 sm:pr-4' : 'pr-3 sm:pr-4',
        'min-h-[52px] sm:min-h-[56px] py-1.5 sm:py-2',
        'font-heebo_regular text-[13px] border-b border-light-blue last:border-b-0',
        clickable
          ? 'cursor-pointer transition-colors hover:bg-middle-blue/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue'
          : '',
        striped ? 'odd:bg-white even:bg-light-blue/16' : '',
        className || '',
      ].join(' ')}
    >
      {/* Lewa: etykieta + ikona */}
      <div className="flex items-center gap-2.5 tracking-wide opacity-70 select-none">
        {icon && <span className="inline-flex items-center justify-center">{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Prawa: wartość / edytor */}
      <div className={['flex items-center gap-2 flex-1 justify-end', flushRight ? 'pr-0' : ''].join(' ')}>
        {onValueClick ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onValueClick()
            }}
            className="text-right text-[14px] rounded-md px-1.5 py-0.5 hover:bg-middle-blue/8 focus-visible:bg-middle-blue/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue"
            data-no-toggle="true"
          >
            {value}
          </button>
        ) : (
          <div ref={valueRef} className={valueClasses} data-no-toggle="true">
            {value}
          </div>
        )}

        {/* feedback kopiowania */}
        <span className={['text-[11px] opacity-60 ml-2 text-right', copied ? 'inline-block' : 'hidden'].join(' ')}>
          Copied!
        </span>

        {/* Ikony akcji */}
        {enabledActions.length > 0 && (
          <div className="flex items-center gap-1 pl-1" data-no-toggle="true">
            {hasEdit && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  triggerEdit()
                }}
                title={(enabledActions.find(a => a.kind === 'edit') as EditAction | undefined)?.label ?? 'Edytuj'}
                aria-label={(enabledActions.find(a => a.kind === 'edit') as EditAction | undefined)?.label ?? 'Edytuj'}
                className="inline-flex items-center justify-center rounded-md p-1 opacity-60 group-hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue focus-visible:ring-offset-1"
              >
                <Edit3 size={14} />
              </button>
            )}

            {enabledActions.some(a => a.kind === 'copy') && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  void runCopy()
                }}
                title={(enabledActions.find(a => a.kind === 'copy') as CopyAction | undefined)?.label ?? 'Kopiuj'}
                aria-label={(enabledActions.find(a => a.kind === 'copy') as CopyAction | undefined)?.label ?? 'Kopiuj'}
                className="inline-flex items-center justify-center rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue focus-visible:ring-offset-1"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}

            {enabledActions
              .filter(a => a.kind === 'custom')
              .map((a, idx) => {
                const c = a as CustomAction
                return (
                  <button
                    key={`custom-${idx}`}
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      c.onClick()
                    }}
                    title={c.title ?? c.label}
                    aria-label={c.title ?? c.label}
                    className="inline-flex items-center justify-center rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue focus-visible:ring-offset-1"
                  >
                    {c.icon}
                  </button>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailRow
