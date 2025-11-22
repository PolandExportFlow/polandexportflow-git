'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, XCircle, Trash2 } from 'lucide-react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  tone?: 'default' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOutsideClick?: boolean
  confirmAutoFocus?: boolean
  busyText?: string
}

const sizeToMaxW: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export default function UniversalConfirmModal({
  open,
  title = 'Delete attachment?',
  description = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'danger',
  size = 'lg',
  closeOnOutsideClick = true,
  confirmAutoFocus = true,
  busyText = 'Working…',
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const lastActiveRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  const openTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  const clearTimers = () => {
    if (openTimer.current !== null) { window.clearTimeout(openTimer.current); openTimer.current = null }
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null }
  }

  useEffect(() => {
    clearTimers()
    if (open) {
      setIsBusy(false)
      lastActiveRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      setIsVisible(true)
      openTimer.current = window.setTimeout(() => setIsAnimating(true), 0)
    } else {
      setIsAnimating(false)
      closeTimer.current = window.setTimeout(() => {
        setIsVisible(false)
        setIsBusy(false)
        document.body.style.overflow = ''
        lastActiveRef.current?.focus?.()
      }, 300)
    }
    return () => { clearTimers(); document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!isVisible) return
    const target = confirmAutoFocus ? confirmBtnRef.current : cancelBtnRef.current
    target?.focus?.()

    const onKey = (e: KeyboardEvent) => {
      if (isBusy) { if (e.key === 'Escape') e.preventDefault(); return }
      if (e.key === 'Escape') { e.preventDefault(); handleCancel() }
      else if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
      else if (e.key === 'Tab') {
        const container = dialogRef.current
        if (!container) return
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.hasAttribute('disabled'))
        if (!focusables.length) return
        const first = focusables[0], last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isVisible, isBusy, confirmAutoFocus])

  const finishClose = useCallback(() => {
    clearTimers()
    setIsVisible(false)
    setIsBusy(false)
    document.body.style.overflow = ''
    onCancel()
    lastActiveRef.current?.focus?.()
  }, [onCancel])

  const handleCancel = useCallback(() => {
    setIsAnimating(false)
    clearTimers()
    closeTimer.current = window.setTimeout(finishClose, 300)
  }, [finishClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!closeOnOutsideClick || isBusy) return
    if (e.target === e.currentTarget) handleCancel()
  }, [closeOnOutsideClick, isBusy, handleCancel])

  const handleContentClick = useCallback((e: React.MouseEvent) => { e.stopPropagation() }, [])

  const handleConfirm = useCallback(async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      await onConfirm()
      setIsBusy(false)
      handleCancel()
    } catch {
      setIsBusy(false)
    }
  }, [onConfirm, handleCancel, isBusy])

  if (!isVisible) return null

  const isDanger = tone === 'danger'
  const confirmBtnBase = isDanger
    ? 'bg-red text-white border-red hover:bg-red/60'
    : 'bg-middle-blue text-white border-middle-blue hover:bg-middle-blue/90'

  return (
    <div
      className={`fixed inset-0 z-50 w-full h-full flex items-center justify-center transition-all duration-300 ease-out cursor-pointer ${
        isAnimating ? 'bg-middle-blue/40 opacity-100' : 'bg-middle-blue/0 opacity-0'
      }`}
      role={isDanger ? 'alertdialog' : 'dialog'}
      aria-modal='true'
      aria-labelledby='ucm-title'
      aria-describedby={description ? 'ucm-desc' : undefined}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`relative w-[95vw] ${sizeToMaxW[size]} bg-light-blue rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-out transform custom-scroll cursor-default border border-middle-blue/20 ${
          isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
        onClick={handleContentClick}
      >
        <div className='p-6 pb-4'>
          <div className='flex items-center justify-between gap-10'>
            <h3 id='ucm-title'>{title}</h3>
            <button
              onClick={handleCancel}
              className='p-3 rounded-lg hover:bg-middle-blue/10 text-middle-blue disabled:opacity-60'
              aria-label='Close'
              disabled={isBusy}
            >
              <X className='w-5 h-5' />
            </button>
          </div>
          {description && (
            <p
              id='ucm-desc'
              className='my-3 whitespace-pre-line break-words leading-[1.5] text-[14px] text-middle-blue/80'
            >
              {description}
            </p>
          )}
        </div>

        <div className='p-6 pt-4 flex items-center justify-end gap-3 border-t border-middle-blue/10'>
          <button
            ref={cancelBtnRef}
            onClick={handleCancel}
            className='flex items-center gap-2 px-5 py-2.5 rounded-lg border border-middle-blue/20 bg-white text-middle-blue hover:bg-middle-blue hover:text-white transition-colors duration-300 disabled:opacity-60'
            disabled={isBusy}
          >
            <XCircle className='w-4 h-4' />
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={handleConfirm}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-colors duration-300 disabled:opacity-60 ${confirmBtnBase}`}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            <Trash2 className='w-4 h-4' />
            {isBusy ? busyText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
