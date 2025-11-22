'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export type UDOption = {
  value: string
  content: React.ReactNode
}

type Props = {
  button: React.ReactNode
  selected: string
  options: UDOption[]
  onSelect: (value: string) => void
  className?: string
  menuClassName?: string
  bareButton?: boolean
}

export default function UniversalDropdownModal({
  button,
  selected,
  options,
  onSelect,
  className,
  menuClassName,
  bareButton = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex(o => o.value === selected)),
    [options, selected]
  )

  useEffect(() => {
    if (open) setHighlightedIndex(selectedIndex)
  }, [open, selectedIndex])

  return (
    <div ref={rootRef} className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={[
          'inline-flex items-center gap-2 rounded-lg transition-colors duration-150 ',
          bareButton
            ? 'px-0 py-0 bg-transparent'
            : (open
                ? 'px-3 py-2 bg-middle-blue/8'
                : 'px-3 py-2 bg-transparent hover:bg-middle-blue/8'),
        ].join(' ')}
      >
        {button}
        {!bareButton && (
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div
          className={[
            'absolute left-0 top-[calc(100%+8px)] z-50 min-w-[220px]',
            'rounded-2xl border border-light-blue bg-white shadow-lg p-2',
            menuClassName ?? '',
          ].join(' ')}
        >
          <div className="flex flex-col">
            {options.map((opt, idx) => {
              const isSelected = selected === opt.value
              const isActive = highlightedIndex === idx
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onFocus={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    onSelect(opt.value)
                    setOpen(false)
                  }}
                  className={[
                    'group flex w-full items-center justify-between rounded-md',
                    'px-3 py-2 text-left transition-colors',
                    isActive ? 'bg-middle-blue/6' : 'hover:bg-middle-blue/10',
                    idx > 0 ? 'border-t border-light-blue/75' : '',
                  ].join(' ')}
                >
                  <div className="min-w-0 flex-1">{opt.content}</div>
                  {isSelected && <Check className="ml-3 h-4 w-4 text-middle-blue" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
