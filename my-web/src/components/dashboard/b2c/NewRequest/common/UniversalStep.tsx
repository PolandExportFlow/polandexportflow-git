'use client'

import React, { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  onBack?: () => void
  onContinue?: () => void
  continueLabel?: string
  panel?: boolean
  panelClassName?: string
  contentClassName?: string
  actionsStickyOnMobile?: boolean
  scrollToTopOnMount?: 'instant' | 'smooth' | false
  iconWrapperClassName?: string
  titleClassName?: string
}

export default function UniversalStep({
  icon,
  title,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  panel = true,
  panelClassName = '',
  contentClassName = '',
  actionsStickyOnMobile = false,
  scrollToTopOnMount = 'smooth',
  iconWrapperClassName,
  titleClassName,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollToTopOnMount) return
    const id = requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: scrollToTopOnMount, block: 'start' })
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: scrollToTopOnMount })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [scrollToTopOnMount])

  const Content = <div className={contentClassName}>{children}</div>

  return (
    <div ref={topRef} className="mt-6 md:mt-12">
      {/* Header */}
      <div className="flex min-w-0 text-middle-blue items-center gap-4 md:gap-5 mb-6">
        <span
          className={[
            'w-10 h-10 md:w-14 md:h-14 shrink-0 rounded-md grid place-items-center pointer-events-none',
            iconWrapperClassName ?? 'bg-middle-blue/6'
          ].join(' ')}
        >
          {icon}
        </span>
        <h4
          className={[
            'truncate font-made_regular pointer-events-none text-[16px] md:text-[18px]',
            titleClassName ?? ''
          ].join(' ')}
        >
          {title}
        </h4>
      </div>

      {/* Content */}
      {panel ? (
        <div className={['rounded-lg bg-middle-blue/4 p-2 pb-4 md:p-6 md:px-8 md:pb-12', panelClassName].join(' ')}>
          {Content}
        </div>
      ) : (
        Content
      )}

      {/* Buttons */}
      {(onBack || onContinue) && (
        <div
          className={[
            'mt-6 flex justify-between items-center font-made_regular text-[13px] md:text-[14px]',
            actionsStickyOnMobile
              ? 'sticky bottom-0 left-0 right-0 bg-light-blue/80 backdrop-blur rounded-md p-3 md:p-0 md:bg-transparent md:backdrop-blur-0'
              : ''
          ].join(' ')}
        >
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-10 py-5 pr-14 bg-middle-blue/6 rounded-md text-middle-blue/80 hover:bg-middle-blue/8 transition tracking-wide"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          ) : (
            <span />
          )}

          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-md bg-green px-10 py-5 pl-12 text-white hover:opacity-80 transition tracking-wide"
            >
              <span>{continueLabel}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
