'use client'

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { PackagePlus, ChevronDown, CheckCircle2, Truck, ShoppingCart } from 'lucide-react'
import clsx from 'clsx'
import UniversalStep from '../common/UniversalStep'
import type { ServiceType } from '../requestTypes'

type Props = {
    value?: ServiceType
    onChange?: (selected: ServiceType) => void
    onContinue?: (selected?: ServiceType) => void
    onBack?: () => void
}

export default function ServiceStep({ value, onChange, onContinue, onBack }: Props) {
    const [selected, setSelected] = useState<ServiceType | undefined>(value)

    useEffect(() => {
        setSelected(value)
    }, [value])

    const handlePick = (v: ServiceType) => {
        setSelected(v)
        onChange?.(v)
    }

    const handleContinue = useMemo(() => (selected ? () => onContinue?.(selected) : undefined), [selected, onContinue])

    return (
        <UniversalStep
            icon={<PackagePlus className='h-6 w-6 md:w-7 md:h-7 text-middle-blue' />}
            title='Choose service type'
            onContinue={handleContinue}
            onBack={onBack}
            continueLabel='Continue'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {/* Karta 1: Parcel Forwarding (Bez zmian) */}
                <ServiceChoiceCard
                    value={'Parcel Forwarding'}
                    selected={selected}
                    onSelect={handlePick}
                    Icon={Truck}
                    title='Parcel Forwarding'
                    desc='You buy and ship items to our warehouse — we forward them abroad.'
                    details={{
                        how: [
                            'You purchase products from Polish stores.',
                            'Sellers ship to our warehouse in Poland.',
                            'We receive, verify, and photograph your items.',
                            'We consolidate packages into one shipment.',
                            'We ship everything to your address abroad.',
                        ],
                        perfect:
                            'I found deals on Allegro/OLX. I’ll buy everything myself and send it to your warehouse — you forward it to me as one international parcel.',
                        included: [
                            'Warehouse address for deliveries',
                            'Photo documentation of received items',
                            'Professional repackaging & consolidation',
                            'Basic quality & damage check',
                            'International shipping with tracking',
                        ],
                    }}
                />

                {/* Karta 2: Assisted Purchase (Zmienione z Personal Shipping) */}
                <ServiceChoiceCard
                    value={'Assisted Purchase'} // ZMIANA 1: Zaktualizowana wartość
                    selected={selected}
                    onSelect={handlePick}
                    Icon={ShoppingCart}
                    title='Assisted Purchase (We Buy & Ship)' // ZMIANA 2: Nowy tytuł
                    desc='You send product links — we buy in Poland and ship to you.' // ZMIANA 3: Nowy opis
                    details={{
                        how: [
                            'You send us product links.',
                            'We purchase on your behalf in Poland.',
                            'Sellers ship to our warehouse.',
                            'We receive, verify, and photograph items.',
                            'We prepare and ship abroad.',
                        ],
                        perfect:
                            'I can’t buy from abroad. I’ll send a link — you purchase in Poland and ship to my address in Canada.',
                        included: [
                            'Secure purchasing within Poland',
                            'Quality control & verification',
                            'Photo proof before shipping',
                            'Purchase support & issue handling',
                            'Pro packaging & international shipping',
                        ],
                    }}
                />
            </div>

            <div className='mt-8 text-center max-w-[1200px] mx-auto opacity-70 pb-4 md:pb-0'>
                <p>
                    Need B2B support or a custom request? We also handle relocation of personal belongings, larger shipping
                    projects, and product sourcing. Learn more in our {' '}
                    <a
                        href='https://polandexportflow.com/how-it-works'
                        className='font-medium hover:text-dark-blue underline underline-offset-2'
                        target='_blank'
                        rel='noopener noreferrer'>
                        service overview
                    </a>
                    .
                </p>
            </div>
        </UniversalStep>
    )
}

function ServiceChoiceCard({
    value,
    selected,
    onSelect,
    title,
    desc,
    details,
    Icon,
}: {
    value: ServiceType
    selected?: ServiceType
    onSelect: (v: ServiceType) => void
    title: string
    desc: string
    details: { how: string[]; perfect: string; included: string[] }
    Icon: React.ElementType
}) {
    const active = selected === value
    const dimmed = !!selected && !active

    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [maxH, setMaxH] = useState(0)
    const detailsId = useMemo(() => `svc-details-${value.replace(/\s+/g, '-').toLowerCase()}`, [value])

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const update = () => setMaxH(el.scrollHeight)
        let ro: ResizeObserver | null = null

        if (open) {
            update()
            if (typeof ResizeObserver !== 'undefined') {
                ro = new ResizeObserver(update)
                ro.observe(el)
            }
        } else {
            setMaxH(0)
        }
        return () => ro?.disconnect()
    }, [open, details])

    useEffect(() => {
        if (wrapperRef.current) {
            try {
                ;(wrapperRef.current as any).inert = !open
            } catch {}
        }
    }, [open])

    return (
        <div
            className={clsx(
                'relative w-full rounded-lg border-2 bg-white p-3 md:p-6 transition-colors cursor-pointer',
                active ? 'border-green' : 'border-middle-blue/20 hover:border-middle-blue/40',
                dimmed ? 'opacity-70' : 'opacity-100'
            )}
            role='radio'
            aria-checked={active}
            tabIndex={0}
            onClick={e => {
                const target = e.target as HTMLElement
                if (target.closest('[data-role="toggle-details"]')) return
                onSelect(value)
            }}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(value)
                }
            }}>
            <span
                aria-hidden
                className={clsx(
                    'absolute top-4 left-4 md:top-6 md:left-6 inline-grid h-4 w-4 md:h-5 md:w-5 place-items-center rounded-full border-2 md:border-[3px]',
                    active ? 'border-green bg-green' : 'border-middle-blue/40 bg-transparent'
                )}>
                {active && <span className='block h-2.5 w-2.5 rounded-full' />}
            </span>

            <input
                type='radio'
                name='service'
                checked={active}
                onChange={() => onSelect(value)}
                className='sr-only'
                aria-label={title}
            />

            <div className='px-6 pt-4 md:pt-6 pb-5 md:pb-8 text-center'>
                <div
                    className={clsx(
                        'mx-auto mb-5 md:mb-6 inline-grid place-items-center rounded-full',
                        'h-10 w-10 md:h-14 md:w-14 shadow-sm',
                        active ? 'bg-green/15 ring-1 ring-green/40' : 'bg-middle-blue/10 ring-1 ring-middle-blue/15'
                    )}>
                    <Icon className={clsx('h-5 w-5 md:h-6 md:w-6', active ? 'text-green' : 'text-middle-blue')} aria-hidden />
                </div>

                <div className='text-[16px] md:text-[18px] text-middle-blue font-heebo_medium truncate mb-3 md:mb-4'>
                    {title}
                </div>
                <div className='text-[13px] md:text-[14px] text-middle-blue/70 mt-1'>{desc}</div>
            </div>

            <button
                type='button'
                data-role='toggle-details'
                onClick={() => setOpen(s => !s)}
                className={clsx(
                    'w-full inline-flex items-center justify-center bg-ds-middle-blue border-middle-blue/8 border text-middle-blue/80 gap-2 rounded-md px-3 py-4',
                    'text-[12px] md:text-[13px] font-made_light transition'
                )}
                aria-expanded={open}
                aria-controls={detailsId}>
                <span>{open ? 'Hide details' : 'Show details'}</span>
                <ChevronDown className={clsx('h-4 w-4 transition-transform', open ? 'rotate-180' : 'rotate-0')} />
            </button>

            <div
                id={detailsId}
                ref={wrapperRef}
                aria-hidden={!open}
                className={clsx(
                    'transition-[max-height,opacity] duration-200 ease-in-out overflow-hidden',
                    open ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                style={{ maxHeight: open ? `${maxH}px` : 0 }}>
                <div ref={ref} className='py-6'>
                    <DetailSection title='How this works:'>
                        <ol className='space-y-2 text-middle-blue font-heebo_medium'>
                            {details.how.map((t, idx) => (
                                <li
                                    key={idx}
                                    className='flex items-center gap-3 md:gap-4 pl-3 md:pl-4 h-12 md:h-16 text-[14px] md:text-[15px] bg-ds-light-blue rounded-md'>
                                    <span className='inline-grid h-6 w-9 md:h-8 md:w-12 shrink-0 place-items-center rounded-full border border-middle-blue/10'>
                                        <span className='font-made_regular opacity-90'>{idx + 1}</span>
                                    </span>
                                    <span className='flex-1 leading-tight'>{t}</span>
                                </li>
                            ))}
                        </ol>
                    </DetailSection>

                    <DetailSection title='Perfect for:'>
                        <div className='bg-ds-middle-blue rounded-md p-4 md:p-5 text-[14px] md:text-[15px] text-middle-blue/75 leading-relaxed'>
                            “{details.perfect}”
                        </div>
                    </DetailSection>

                    <DetailSection title='What’s included:'>
                        <ul className='space-y-2 text-middle-blue font-heebo_medium'>
                            {details.included.map((t, idx) => (
                                <li
                                    key={idx}
                                    className='flex items-center gap-3 md:gap-4 pl-3 md:pl-4 h-12 md:h-16 text-[14px] md:text-[15px] bg-green/6 rounded-md'>
                                    <span className='inline-grid h-6 w-6 md:h-8 md:w-8 shrink-0 place-items-center rounded-full bg-green/12'>
                                        <CheckCircle2 className='h-4 w-4 md:h-5 md:w-5 text-green' />
                                    </span>
                                    <span className='flex-1 leading-tight'>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </DetailSection>
                </div>
            </div>
        </div>
    )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className='mb-10 last:mb-0 px-2'>
            <h4 className='text-[14px] md:text-[15px] font-made_regular text-middle-blue mb-4'>{title}</h4>
            {children}
        </section>
    )
}