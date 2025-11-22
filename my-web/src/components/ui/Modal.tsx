'use client'

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useId,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'md' | 'lg' | 'full'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  showCloseButton?: boolean
  size?: ModalSize
  className?: string
  bodyClassName?: string
  initialFocusRef?: React.RefObject<HTMLElement>
  disableBackdropClose?: boolean
  disableEscClose?: boolean
  panelWidth?: number | string
  panelMaxWidth?: number | string
  panelHeight?: number | string
  panelMaxHeight?: number | string
  'aria-label'?: string
}

const HEADER_PAD: Record<Exclude<ModalSize, 'full'>, string> = {
  sm: 'px-2 py-2 sm:px-5 sm:py-3',
  md: 'px-4 py-4 sm:px-6 sm:py-5',
  lg: 'px-4 py-3 sm:px-10 sm:py-5',
}
const BODY_PAD: Record<Exclude<ModalSize, 'full'>, string> = {
  sm: 'px-2 py-2 sm:px-6 sm:py-4',
  md: 'px-2 md:px-2.5 pb-6',
  lg: 'px-3 py-3 sm:px-6 sm:py-6',
}

function toCss(v?: number | string) {
  if (v == null) return undefined
  return typeof v === 'number' ? `${v}px` : v
}

const ANIM_MS = 240
type Phase = 'pre-enter' | 'entering' | 'open' | 'exiting'

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  icon,
  actions,
  showCloseButton = true,
  size = 'lg',
  className,
  bodyClassName,
  initialFocusRef,
  disableBackdropClose = false,
  disableEscClose = false,
  panelWidth,
  panelMaxWidth,
  panelHeight,
  panelMaxHeight,
  'aria-label': ariaLabel,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isRendered, setIsRendered] = useState(false)
  const [phase, setPhase] = useState<Phase>('exiting')
  const [reducedMotion, setReducedMotion] = useState(false)

  const [hasScroll, setHasScroll] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const panelRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastActiveRef = useRef<HTMLElement | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  const titleId = useId()

  useEffect(() => {
    setMounted(true)
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const set = () => setReducedMotion(!!m?.matches)
    set()
    m?.addEventListener?.('change', set)
    return () => m?.removeEventListener?.('change', set)
  }, [])

  useLayoutEffect(() => {
    if (!mounted) return
    let focusTimer: number | undefined
    let closeTimer: number | undefined

    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlPaddingRight: html.style.paddingRight,
      bodyPaddingRight: body.style.paddingRight,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      scrollY: window.scrollY,
    }

    if (isOpen) {
      setIsRendered(true)
      const scrollbarW = window.innerWidth - html.clientWidth
      if (scrollbarW > 0) {
        html.style.paddingRight = `${scrollbarW}px`
        body.style.paddingRight = `${scrollbarW}px`
      }
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${prev.scrollY}px`
      body.style.width = '100%'

      lastActiveRef.current = document.activeElement as HTMLElement | null

      if (reducedMotion) setPhase('open')
      else {
        setPhase('pre-enter')
        requestAnimationFrame(() => setPhase('entering'))
      }

      focusTimer = window.setTimeout(() => {
        const el =
          initialFocusRef?.current ||
          panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ||
          panelRef.current?.querySelector<HTMLElement>(
            'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
          ) ||
          panelRef.current
        el?.focus()
      }, 30)
    } else {
      const cleanup = () => {
        const html = document.documentElement
        const body = document.body
        html.style.overflow = prev.htmlOverflow
        body.style.overflow = prev.bodyOverflow
        html.style.paddingRight = prev.htmlPaddingRight
        body.style.paddingRight = prev.bodyPaddingRight
        body.style.position = prev.bodyPosition
        body.style.top = prev.bodyTop
        body.style.width = prev.bodyWidth
        window.scrollTo({ top: prev.scrollY })
        lastActiveRef.current?.focus?.()
      }

      if (reducedMotion) {
        setIsRendered(false)
        cleanup()
      } else {
        setPhase('exiting')
        closeTimer = window.setTimeout(() => {
          setIsRendered(false)
          cleanup()
        }, ANIM_MS)
      }
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer)
      if (closeTimer) clearTimeout(closeTimer)
      const html = document.documentElement
      const body = document.body
      html.style.overflow = ''
      body.style.overflow = ''
      html.style.paddingRight = ''
      body.style.paddingRight = ''
      body.style.position = ''
      body.style.top = ''
      body.style.width = ''
    }
  }, [isOpen, mounted, initialFocusRef, reducedMotion])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const canScroll = el.scrollHeight > el.clientHeight + 1
    setHasScroll(canScroll)
    setScrolled(el.scrollTop > 0)
  }, [])

  useEffect(() => {
    if (!isRendered) return
    const el = scrollRef.current
    if (!el) return
    updateScrollState()

    const onScroll = () => setScrolled(el.scrollTop > 0)
    el.addEventListener('scroll', onScroll, { passive: true })

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => updateScrollState())
      ro.observe(el)
      roRef.current = ro
    }

    const onResize = () => updateScrollState()
    window.addEventListener('resize', onResize)

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      roRef.current?.disconnect()
      roRef.current = null
    }
  }, [isRendered, updateScrollState])

  const handleClose = useCallback(() => {
    if (!isOpen) return
    onClose()
  }, [isOpen, onClose])

  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (disableBackdropClose) return
      if (e.target === e.currentTarget) handleClose()
    },
    [disableBackdropClose, handleClose]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscClose) {
        e.stopPropagation()
        handleClose()
        return
      }
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
        )
        if (!focusables || focusables.length === 0) return
        const list = Array.from(focusables)
        const first = list[0]
        const last = list[list.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || !panelRef.current?.contains(active)) {
            last.focus()
            e.preventDefault()
          }
        } else {
          if (active === last || !panelRef.current?.contains(active)) {
            first.focus()
            e.preventDefault()
          }
        }
      }
    },
    [disableEscClose, handleClose]
  )

  if (!mounted || !isRendered) return null

  const isFull = size === 'full'

  const panelStyle: React.CSSProperties = {
    width: toCss(panelWidth) ?? (isFull ? '100vw' : undefined),
    maxWidth: toCss(panelMaxWidth) ?? (isFull ? '100vw' : '96vw'),
    height: toCss(panelHeight) ?? (isFull ? '100dvh' : undefined),
    maxHeight: toCss(panelMaxHeight) ?? (isFull ? '100dvh' : '90dvh'),
  }

  // ⬅️ ZMIANA 1: wyrównanie do góry na mobile
  const backdropClass = [
    'fixed inset-0 z-[1000] flex items-start sm:items-center justify-center',
    'transition-opacity duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
    'overscroll-contain',
    phase === 'pre-enter' || phase === 'exiting' ? 'opacity-0' : 'opacity-100',
    'bg-middle-blue/40',
    disableBackdropClose ? 'cursor-default' : 'cursor-pointer',
    className || '',
  ].join(' ')

  // ⬅️ ZMIANA 2: na mobile tylko max-h, a nie stała h (żeby nie rozciągać na cały ekran)
  const mobileBox = isFull
    ? 'w-screen h-[100dvh] m-2'
    : 'w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] h-auto m-2'

  const mobileRound = isFull ? 'rounded-none' : 'rounded-md'

  const panelBase =
    `relative flex flex-col min-h-0 ${mobileBox} bg-light-blue shadow-2xl overflow-hidden ${mobileRound} ` +
    'sm:w-full sm:h-auto sm:m-0 ' +
    (isFull ? '' : 'sm:rounded-2xl ') +
    'transform-gpu will-change-transform will-change-opacity ' +
    'transition-all duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] cursor-auto origin-center'

  const panelPhaseClass = reducedMotion
    ? 'opacity-100 translate-y-0 sm:scale-100'
    : phase === 'pre-enter'
    ? 'opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95'
    : phase === 'entering'
    ? 'opacity-100 translate-y-0 sm:scale-100'
    : phase === 'open'
    ? 'opacity-100 translate-y-0 sm:scale-100'
    : 'opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95'

  const dialogProps: Record<string, any> = { role: 'dialog', 'aria-modal': 'true' }
  if (title && !ariaLabel) dialogProps['aria-labelledby'] = titleId
  else if (ariaLabel) dialogProps['aria-label'] = ariaLabel

  const headerPad =
    size === 'full' ? 'px-0 py-0' : HEADER_PAD[size as Exclude<ModalSize, 'full'>]
  const bodyPad =
    size === 'full' ? 'px-0 py-0' : BODY_PAD[size as Exclude<ModalSize, 'full'>]

  const showDivider = hasScroll || scrolled

  return createPortal(
    <div className={backdropClass} onClick={onBackdropClick} onKeyDown={onKeyDown} {...dialogProps}>
      <div
        ref={panelRef}
        className={[panelBase, panelPhaseClass].join(' ')}
        style={panelStyle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={[
            'sticky top-0 z-10',
            'backdrop-blur supports-[backdrop-filter]:bg-light-blue/70 bg-light-blue',
            showDivider ? 'border-b border-middle-blue/15' : 'border-b border-transparent',
            'transition-colors duration-200',
          ].join(' ')}
        >
          <div className={['flex items-center justify-between gap-2 sm:gap-3', headerPad].join(' ')}>
            <div className="min-w-0 flex items-center gap-2 sm:gap-4">
              {icon ? (
                <span className="inline-flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-md bg-middle-blue/10 text-middle-blue shrink-0 select-none">
                  {icon}
                </span>
              ) : null}
              {title ? (
                <span id={titleId} className="tracking-wide truncate text-middle-blue font-made_regular text-[14px] md:text-[15px]">
                  {title}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {actions}
              {showCloseButton && !size.includes('full') ? (
                <button
                  onClick={handleClose}
                  data-modal-close
                  className="p-2 sm:p-3 rounded-lg hover:bg-middle-blue/10 text-middle-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue/30"
                  aria-label="Close"
                  data-autofocus
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Scroll area */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-auto custom-scroll overscroll-contain"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <div className={[bodyPad, bodyClassName || ''].join(' ')}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}
