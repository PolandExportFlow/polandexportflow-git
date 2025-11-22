'use client'

import React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'

type Variant = 'default' | 'primary'

// Dokładny typ href dla <Link>
type Href = Exclude<Parameters<typeof Link>[0]['href'], undefined>

type CommonProps = {
  Icon: LucideIcon
  title: string
  subtitle?: string
  variant?: Variant
  className?: string
  showArrow?: boolean
}

// Dwa wzajemnie wykluczające się zestawy propsów
type LinkButtonProps = CommonProps & { href: Href; onClick?: never }
type ClickButtonProps = CommonProps & { onClick: () => void; href?: undefined }
type DashboardButtonProps = LinkButtonProps | ClickButtonProps

// --- type-guard dla "rest" (po destrukturyzacji ma tylko href?/onClick) ---
function hasHrefRest(p: { href?: Href }): p is { href: Href } {
  return p.href !== undefined
}

// --- type-guard dla pełnych propsów (używany w areEqual) ---
function isLinkProps(p: DashboardButtonProps): p is LinkButtonProps {
  return p.href !== undefined
}

function DashboardButtonRaw({
  Icon,
  title,
  subtitle,
  variant = 'default',
  className,
  showArrow = true,
  ...rest
}: DashboardButtonProps) {
  const isPrimary = variant === 'primary'

  const accentPrimary =
    "before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-green before:rounded-l-lg before:z-[1]"

  const interactiveClasses = clsx(
    'group relative w-full rounded-lg p-4 md:p-6 min-h-[72px]',
    'flex items-center gap-4 text-left',
    isPrimary && accentPrimary,
    'transition-colors duration-200 ease-out',
    isPrimary ? 'hover:bg-[#F6FFFA]' : 'hover:bg-light-blue/44',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
    isPrimary ? 'focus-visible:ring-[#2ABB66]' : 'focus-visible:ring-[#1D5FA7]'
  )

  const Content = (
    <>
      <span
        className={clsx(
          'w-10 h-10 shrink-0 rounded-md grid place-items-center',
          isPrimary ? 'bg-[#E9F9F1]' : 'bg-[#e9f3ff]'
        )}
        aria-hidden="true"
      >
        <Icon className={clsx('w-6 h-6', isPrimary ? 'text-[#0E4F3A]' : 'text-middle-blue')} />
      </span>

      <span className="flex-1 min-w-0">
        <span
          className={clsx(
            'block truncate font-heebo_medium text-[15px] leading-tight text-left',
            isPrimary ? 'text-[#0E4F3A]' : 'text-[#0F3A5E]'
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className={clsx(
              'block truncate text-[13px] leading-snug mt-1',
              isPrimary ? 'text-[#23614B]' : 'text-[#1F5385]'
            )}
          >
            {subtitle}
          </span>
        )}
      </span>

      {showArrow && (
        <ChevronRight
          className={clsx(
            'ml-auto h-5 w-5 shrink-0 opacity-70',
            'transition-transform duration-200 ease-out',
            'group-hover:translate-x-0.5',
            isPrimary ? 'text-[#23614B]' : 'text-[#1F5385]'
          )}
          aria-hidden
        />
      )}
    </>
  )

  return (
    <section
      className={clsx(
        'relative w-full rounded-lg overflow-visible shadow-sm',
        'bg-[#FFFFFF] text-[#0F3A5E] border border-[#D9E6F2]',
        className
      )}
    >
      <header className="w-full">
        {hasHrefRest(rest) ? (
          <Link href={rest.href} prefetch aria-label={title} className={interactiveClasses}>
            {Content}
          </Link>
        ) : (
          <button type="button" onClick={(rest as ClickButtonProps).onClick} aria-label={title} className={interactiveClasses}>
            {Content}
          </button>
        )}
      </header>
    </section>
  )
}

function areEqual(prev: DashboardButtonProps, next: DashboardButtonProps) {
  const sameAction = isLinkProps(prev)
    ? isLinkProps(next) && prev.href === next.href
    : !isLinkProps(next) && prev.onClick === next.onClick

  return (
    prev.Icon === next.Icon &&
    prev.title === next.title &&
    prev.subtitle === next.subtitle &&
    sameAction &&
    prev.variant === next.variant &&
    prev.className === next.className &&
    prev.showArrow === next.showArrow
  )
}

export default React.memo(DashboardButtonRaw, areEqual)
