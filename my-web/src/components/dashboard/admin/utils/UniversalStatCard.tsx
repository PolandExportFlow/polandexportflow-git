'use client'

import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface UniversalStatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  className?: string
}

export const UniversalStatCard: React.FC<UniversalStatCardProps> = memo(
  ({ icon: Icon, label, value, className = '' }) => (
    <div
      className={[
        'flex items-center gap-4 sm:gap-6',
        'p-4 sm:p-6 bg-white rounded-xl text-middle-blue',
        'border border-middle-blue/15 shadow-sm tracking-wide',
        'select-none',
        className,
      ].join(' ')}
    >
      <div className='flex items-center justify-center p-2.5 sm:p-3 rounded-lg bg-light-blue/75 shrink-0'>
        <Icon className='w-5 h-5 sm:w-6 sm:h-6' />
      </div>

      {/* KLUCZ: flex-1 + min-w-0 */}
      <div className='flex-1 min-w-0 flex flex-col gap-2'>
        <span
          className='block max-w-full text-[10px] sm:text-[11px] font-heebo_regular opacity-60 truncate'
          title={String(label)}
        >
          {label}
        </span>

        <span
          className='block max-w-full text-[15px] sm:text-[16px] font-made_regular leading-none truncate'
          title={String(value)}
        >
          {value}
        </span>
      </div>
    </div>
  )
)
