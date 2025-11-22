'use client'

import React, { useState, useMemo, useEffect, useRef, type ReactElement } from 'react'

type Align = 'left' | 'center' | 'right'

type NumberProps = {
  value: number
  onCommit: (next: number) => void
  mode?: 'number'
  align?: Align
  suffix?: string
  prefix?: string
  min?: number
  step?: number | string
  widthPx?: number
  displayClassName?: string
  className?: string
  format?: (n: number) => string
  placeholder?: string
  decimals?: number
  maxLength?: never
  onStartEdit?: () => void
  onCancel?: () => void
  autoStartEditing?: boolean
  /** Wąsko na mobile (min. 140px, max 70vw) */
  compactMobile?: boolean
}

type TextProps = {
  value: string
  onCommit: (next: string) => void
  mode?: 'text'
  align?: Align
  suffix?: never
  prefix?: string
  widthPx?: number
  displayClassName?: string
  className?: string
  placeholder?: string
  maxLength?: number
  onStartEdit?: () => void
  onCancel?: () => void
  autoStartEditing?: boolean
  compactMobile?: boolean
}

type Props = NumberProps | TextProps

function safeFixed(n: unknown, decimals: number) {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v.toFixed(decimals) : (0).toFixed(decimals)
}

export default function UniversalTableInput(props: Props): ReactElement {
  const {
    value,
    onCommit,
    align = 'right',
    widthPx = 80,
    displayClassName,
    placeholder,
    onStartEdit,
    onCancel,
    autoStartEditing,
    compactMobile = false,
  } = props

  const inputRef = useRef<HTMLInputElement | null>(null)

  const isNumberMode = useMemo(() => {
    if ('mode' in props && props.mode) return props.mode === 'number'
    return typeof value === 'number'
  }, [props, value])

  const decimals = isNumberMode ? (props as NumberProps).decimals ?? 0 : 0
  const textWidthPx = !isNumberMode ? ((props as TextProps).widthPx ?? 300) : undefined

  const [editing, setEditing] = useState<boolean>(!!autoStartEditing)
  const [tmp, setTmp] = useState<string>(() =>
    isNumberMode ? safeFixed(value, decimals) : String(value ?? '')
  )

  useEffect(() => { if (autoStartEditing) setEditing(true) }, [autoStartEditing])

  useEffect(() => {
    if (editing) return
    setTmp(isNumberMode ? safeFixed(value, decimals) : String(value ?? ''))
  }, [editing, value, isNumberMode, decimals])

  useEffect(() => {
    if (!editing) return
    const t = window.setTimeout(() => {
      inputRef.current?.focus()
      ;(inputRef.current as any)?.select?.()
    }, 0)
    return () => window.clearTimeout(t)
  }, [editing])

  const parseNumber = (raw: string): number => {
    const cleaned = (raw ?? '').replace(/\s/g, '').replace(',', '.')
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return NaN
    const min = (props as NumberProps).min ?? 0
    const pow = Math.pow(10, decimals)
    const rounded = Math.round(n * pow) / pow
    return Math.max(min, rounded)
  }

  const commit = (): void => {
    if (isNumberMode) {
      const next = parseNumber(tmp)
      if (Number.isNaN(next)) {
        setEditing(false)
        setTmp(safeFixed(value, decimals))
        return
      }
      ;(onCommit as NumberProps['onCommit'])(next)
      setEditing(false)
      return
    }
    ;(onCommit as TextProps['onCommit'])(tmp)
    setEditing(false)
  }

  const cancel = (): void => {
    setEditing(false)
    setTmp(isNumberMode ? safeFixed(value, decimals) : String(value ?? ''))
    onCancel?.()
  }

  const justify =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
  const textAlign =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

  /* ===== DISPLAY ===== */
  if (!editing) {
    const hasText = isNumberMode ? true : Boolean(String(value ?? '').trim())
    const leftText = isNumberMode
      ? (() => {
          const n = value as number
          const fmt = (props as NumberProps).format
          return fmt ? fmt(n) : safeFixed(n, decimals)
        })()
      : (hasText ? String(value ?? '') : (placeholder ?? '—'))

    const pref = (props as any).prefix ? String((props as any).prefix).trim() : ''
    const suff = isNumberMode && (props as NumberProps).suffix ? ` ${String((props as NumberProps).suffix)}` : ''
    const display = `${pref ? pref + ' ' : ''}${leftText}${suff}`

    return (
      <div
        className={`flex w-full min-w-0 ${justify}`}
        onClick={() => { setEditing(true); onStartEdit?.() }}
        title="Kliknij, aby edytować"
      >
        <span
          className={[
            'px-3 py-2.5 rounded-md',
            'inline-block break-words',
            'leading-[2]',
            displayClassName || 'text-[14px] text-middle-blue',
            textAlign,
            hasText ? '' : 'opacity-50',
            'cursor-pointer hover:bg-middle-blue/8 transition-colors',
            compactMobile ? 'max-w-[140px] sm:max-w-[220px]' : '',
          ].join(' ')}
          style={{ maxWidth: isNumberMode || compactMobile ? undefined : `${textWidthPx}px` }}
        >
          {display}
        </span>
      </div>
    )
  }

  /* ===== EDYCJA ===== */
  const pref = (props as any).prefix as string | undefined
  const suff = isNumberMode ? (props as NumberProps).suffix : undefined
  const extraClass = (props as any).className || ''

  // ⛔️ kluczowe: wrapper NIGDY nie przekroczy kolumny wartości
  const wrapperStyle: React.CSSProperties = compactMobile
    ? { width: 'min(70vw, 140px)' }
    : { width: 'min(65%, 220px)' }

  return (
    <div className={`flex items-center w-full min-w-0 ${justify} pr-2`}>
      {pref ? <span className="text-middle-blue text-[13px] whitespace-nowrap mr-2 flex-none">{pref}</span> : null}

      <div style={wrapperStyle}>
        {isNumberMode ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step={(props as NumberProps).step ?? '1'}
            value={tmp}
            placeholder={placeholder ?? '—'}
            onChange={e => setTmp(e.target.value)}
            autoComplete="off"
            onBlur={() => setTimeout(commit, 0)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commit() }
              if (e.key === 'Escape') { e.preventDefault(); cancel() }
            }}
            className={[
              'w-full',
              'px-3.5 py-3 rounded-lg border outline-none shadow-none text-[14px] text-middle-blue',
              'bg-white border-light-blue focus:ring-2 focus:ring-light-blue/60',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              'leading-[2]',
              textAlign,
              extraClass,
            ].join(' ')}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={tmp}
            placeholder={placeholder ?? '—'}
            onChange={e => setTmp(e.target.value)}
            autoComplete="off"
            onBlur={() => setTimeout(commit, 0)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commit() }
              if (e.key === 'Escape') { e.preventDefault(); cancel() }
            }}
            className={[
              'w-full',
              'px-3.5 py-3 rounded-lg border outline-none shadow-none text-[14px] text-middle-blue',
              'bg-white border-light-blue focus:ring-2 focus:ring-light-blue/60',
              'leading-[2]',
              textAlign,
              extraClass,
            ].join(' ')}
            // dla desktopu możesz chcieć szersze – wrapper to ogranicza
          />
        )}
      </div>

      {suff ? <span className="text-middle-blue text-[13px] whitespace-nowrap ml-2 flex-none">{suff}</span> : null}
    </div>
  )
}
