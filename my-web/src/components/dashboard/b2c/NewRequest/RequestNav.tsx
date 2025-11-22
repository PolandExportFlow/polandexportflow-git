'use client'

import React from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import type { StepKey } from './NewRequest'

export type Step<K extends string = StepKey> = { key: K; label: string; Icon: React.ElementType }

/** Tryby propsów */
type ByIndexProps<K extends string = StepKey> = {
  steps: Step<K>[]
  activeIndex: number
  onStepClick?: (idx: number, key: K) => void
  clickableFuture?: boolean
  maxReachableIndex?: number
}

type ByKeyProps<K extends string = StepKey> = {
  steps: Step<K>[]
  activeKey: K
  onStepClick?: (idx: number, key: K) => void
  clickableFuture?: boolean
  maxReachableIndex?: number
}

type RequestNavProps<K extends string = StepKey> = ByIndexProps<K> | ByKeyProps<K>

export default function RequestNav<K extends string = StepKey>(props: RequestNavProps<K>) {
  const { steps, onStepClick, clickableFuture = false, maxReachableIndex } = props as any

  const activeIndex: number =
    'activeKey' in props
      ? Math.max(0, steps.findIndex((s: Step<K>) => s.key === (props as ByKeyProps<K>).activeKey))
      : (props as ByIndexProps<K>).activeIndex

  return (
    <div>
      <nav
        aria-label='Progress'
        className='flex items-center w-full  p-4 p md:pt-6 md:pb-10 md:px-14 lg:my-8 overflow-hidden bg-middle-blue/4  rounded-md'
      >
        {steps.map(({ key, label, Icon }: Step<K>, i: number) => {
          const done = i < activeIndex
          const current = i === activeIndex
          const isLast = i === steps.length - 1
          const canClick =
            typeof maxReachableIndex === 'number'
              ? i <= maxReachableIndex
              : clickableFuture
              ? true
              : i <= activeIndex

          return (
            <React.Fragment key={String(key)}>
              <button
                type='button'
                onClick={() => canClick && onStepClick?.(i, key)}
                title={label}
                aria-current={current ? 'step' : undefined}
                aria-disabled={canClick ? undefined : true}
                className={clsx(
                  'group relative inline-grid place-items-center rounded-full shrink-0',
                  'h-10 w-12 md:h-12 md:w-16 transition-all',
                  canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
                  done
                    ? 'bg-green text-white'
                    : current
                    ? 'bg-middle-blue text-white border border-dark-blue/40'
                    : 'bg-middle-blue/20 text-middle-blue/60 hover:bg-middle-blue/36'
                )}
              >
                {done ? (
                  <Check className='h-4 w-4 md:h-5 md:w-5' />
                ) : (
                  <Icon className={clsx('h-4 w-4 md:h-5 md:w-5', current ? 'opacity-100' : 'opacity-70')} />
                )}
                <span
                  className={clsx(
                    'absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap',
                    'hidden md:block text-[12px]',
                    current ? 'text-[#0F3A5E]' : 'text-middle-blue/60'
                  )}
                >
                  {label}
                </span>
              </button>

              {!isLast && (
                <span
                  aria-hidden
                  className={clsx(
                    'flex-1 h-px sm:h-[2px] mx-2 sm:mx-3 rounded-full transition-colors',
                    i < activeIndex ? 'bg-green' : 'bg-middle-blue/25'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </div>
  )
}
