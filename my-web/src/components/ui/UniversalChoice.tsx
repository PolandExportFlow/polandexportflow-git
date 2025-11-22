'use client'

import React from 'react' // Usunięto useCallback z importu, aby uniknąć błędu
import { cn } from '@/utils/cn'

export type UniversalChoiceOption = {
    value: string
    label: React.ReactNode
    icon?: React.ReactNode
    sub?: React.ReactNode
}

type ColNum = 1 | 2 | 3 | 4 | 5 | 6
type BP = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'min2000'

type Props = {
    options: UniversalChoiceOption[]
    value?: string
    onChange?: (val: string) => void

    /** Preferowane: liczba kolumn per breakpoint, np. { base:1, lg:2, min2000:4 } */
    cols?: Partial<Record<BP, ColNum>>

    /** Legacy – jeśli podasz `cols`, to ma priorytet */
    columns?: ColNum
    mobileColumns?: 1 | 2

    size?: 'sm' | 'md' | 'lg'
    className?: string
    // KLUCZOWA ZMIANA: itemClassName akceptuje tylko string, używamy go jako dynamiczną klasę.
    itemClassName?: string
    gridClassName?: string
    ariaLabel?: string
    contentAlign?: 'start' | 'between'
    showSelectionDot?: boolean
    // USUNIĘTO getItemClassName, bo kolidowało z typami i komplikowało CheckoutPanel
}

const SIZE = {
    lg: {
        pad: 'px-6 py-4',
        minH: 'min-h-[56px]',
        icon: 'h-6 w-6',
        text: 'text-[15px] leading-none',
        sub: 'text-[12px]',
        gap: 'gap-2.5',
        dot: 'h-4 w-4',
    },
    md: {
        pad: 'px-5 py-3.5',
        minH: 'min-h-[50px]',
        icon: 'h-5 w-5',
        text: 'text-[14px] leading-none',
        sub: 'text-[11px]',
        gap: 'gap-2',
        dot: 'h-4 w-4',
    },
    sm: {
        pad: 'px-4 py-2.5',
        minH: 'min-h-[44px]',
        icon: 'h-5 w-5',
        text: 'text-[14px] leading-none',
        sub: 'text-[11px]',
        gap: 'gap-2',
        dot: 'h-4 w-4',
    },
} as const

function buildGridClasses(cols?: Props['cols'], fallback?: { columns?: ColNum; mobileColumns?: 1 | 2 }) {
    if (cols && Object.keys(cols).length) {
        const order: BP[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl', 'min2000']
        const parts: string[] = []
        for (const bp of order) {
            const n = cols[bp]
            if (!n) continue
            if (bp === 'base') {
                parts.push(`grid-cols-${n}`)
            } else if (bp === 'min2000') {
                parts.push(`min-[2000px]:grid-cols-${n}`)
            } else {
                parts.push(`${bp}:grid-cols-${n}`)
            }
        }
        return parts.join(' ')
    }

    // legacy
    const { columns, mobileColumns } = fallback || {}
    const mobile = mobileColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'
    const desktop =
        columns === 6
            ? 'lg:grid-cols-6'
            : columns === 5
            ? 'lg:grid-cols-5'
            : columns === 4
            ? 'min-[2000px]:grid-cols-4'
            : columns === 3
            ? 'md:grid-cols-3'
            : columns === 2
            ? 'sm:grid-cols-2'
            : 'sm:grid-cols-1'

    return `${mobile} ${desktop}`
}

export default function UniversalChoice({
    options,
    value,
    onChange,
    cols,
    columns = 3,
    mobileColumns = 1,
    size = 'md',
    className,
    itemClassName,
    gridClassName,
    ariaLabel,
    contentAlign = 'start',
    showSelectionDot = false,
}: Props) {
    const s = SIZE[size]
    const grid = buildGridClasses(cols, { columns, mobileColumns })

    // PRZECHODZIMY NA STAŁĄ KLASĘ itemClassName dla wszystkich (CheckoutPanel obsłuży dynamikę)

    return (
        <div role='listbox' aria-label={ariaLabel} className={cn('w-full grid gap-2', grid, gridClassName, className)}>
            {options.map(opt => {
                const active = opt.value === value
                const isCustom = React.isValidElement(opt.label)

                return (
                    // WERSJA 2: Poprawiamy logikę szerokości, używając 'w-full' tylko w legacy
                    <button
                        key={opt.value}
                        type='button'
                        role='option'
                        aria-selected={active}
                        onClick={() => onChange?.(opt.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onChange?.(opt.value)
                            }
                        }}
                        className={cn(
                            'rounded-xl border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue/25', 
                            'h-full', 
                            s.pad,
                            s.minH,
                            'flex items-center justify-between',
                            active
                                ? 'border-middle-blue/40 bg-light-blue'
                                : 'border-middle-blue/20 hover:border-middle-blue/40 hover:bg-light-blue/60',
                            itemClassName // Tutaj wpada stała klasa 'sm:col-span-2' dla Stripe
                        )}>
                        {/* LEWA: ZAWARTOŚĆ (Etykieta i Ikonka/Logo) */}
                        {isCustom ? (
                            // POPRAWKA: Element niestandardowy MUSI mieć flex-1
                            <div className='flex-1 min-w-0'>{opt.label}</div> 
                        ) : (
                            // STANDARDOWY ELEMENT
                            <div className={cn(
                                // KLUCZOWA POPRAWKA DLA STANDARDOWEJ ETYKIETY: flex-1
                                'flex items-center min-w-0 flex-1', 
                                s.gap,
                                contentAlign === 'between' ? 'w-full justify-between' : 'justify-start'
                            )}>
                                {opt.icon ? (
                                    <span className={cn('inline-flex items-center justify-center shrink-0', s.icon)}>{opt.icon}</span>
                                ) : null}

                                <span className='inline-flex items-center min-w-0'>
                                    <span
                                        className={cn(
                                            'font-heebo_medium truncate',
                                            s.text,
                                            active ? 'text-middle-blue' : 'text-dark-blue'
                                        )}>
                                        {opt.label as React.ReactNode}
                                    </span>
                                    {opt.sub ? <span className={cn('ml-2 opacity-60', s.sub)}>{opt.sub}</span> : null}
                                </span>
                            </div>
                        )}

                        {/* PRAWA: kropka wyboru */}
                        {showSelectionDot ? (
                            <span
                                aria-hidden
                                className={cn(
                                    'ml-auto rounded-full border shrink-0 self-center',
                                    s.dot,
                                    active ? 'bg-middle-blue border-middle-blue' : 'border-middle-blue/40 bg-transparent'
                                )}
                            />
                        ) : null}
                    </button>
                )
            })}
        </div>
    )
}