'use client'

import { ReactNode } from 'react'

interface UniversalAdminCardProps {
  title?: string
  subtitle?: string
  headerAction?: ReactNode
  children: ReactNode
  className?: string
}

function UniversalAdminCard({
  title,
  subtitle,
  headerAction,
  children,
  className,
}: UniversalAdminCardProps) {
  const hasHeader = Boolean(title || subtitle || headerAction)

  const classes = [
    'group',
    hasHeader ? 'space-y-4' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {hasHeader && (
        <div className="flex items-start justify-between">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="opacity-70 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}

      <div>{children}</div>
    </div>
  )
}

export default UniversalAdminCard
