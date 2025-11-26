'use client'

import React, { useMemo } from 'react'
import { Truck, Percent, TrendingUp, Calculator, Tag, Equal, ScrollText } from 'lucide-react'
import UniversalDetailOption from '@/components/ui/UniversalDetailOption'
import { getLogo } from '@/utils/getLogo'
import type { ShippingQuote, MethodCode, Currency, PaymentBreakdown } from '../../clientOrderTypes'

type Props = {
    currency: Currency
    breakdown: PaymentBreakdown
    methodKey: MethodCode | string
    effectiveQuote?: ShippingQuote
    fromPLN: (amountPLN: number, c?: Currency | string) => number
    format: (amount: number, c?: Currency | string) => string
}

/* === Helpers === */
const pctLabel = (v?: number | null) =>
    v == null || Number.isNaN(+v) ? '—' : `${(+v).toFixed(2).replace(/\.?0+$/, '')}%`

const carrierKeyFromLabel = (label?: string | null): string => {
    const raw = String(label ?? '').toLowerCase().replace(/\s+/g, '')
    const candidates = [raw, raw.replace(/[^a-z0-9]/g, ''), raw.replace(/-/g, '')]
    if (/poczta/.test(raw) || /polishpost/.test(raw)) candidates.unshift('pocztapolska')
    for (const k of candidates) if (getLogo('carrier', k)) return k
    return raw
}

const defaultCarrierHeights: Record<string, number> = {
    dhl: 10,
    ups: 23,
    upsstandard: 20,
    inpost: 20,
    dpd: 20,
    gls: 20,
    fedex: 22,
    pocztapolska: 20,
}

const defaultPaymentHeights: Partial<Record<MethodCode | 'stripe', number>> = {
    paypal: 16,
    revolut: 16,
    stripe: 26, 
}

export default function PaymentSummary({
    currency,
    breakdown,
    methodKey,
    effectiveQuote,
    fromPLN,
    format,
}: Props) {
    const money = useMemo(
        () => (pln: number) => format(fromPLN(pln), currency),
        [fromPLN, format, currency]
    )

    const methodKeyStr = String(methodKey || 'paypal').toLowerCase()
    const paymentLogoSrc = getLogo('payment', methodKeyStr) || ''
    const paymentH = defaultPaymentHeights[methodKeyStr as 'stripe'] ?? 16 

    const carrierLabel = effectiveQuote?.quote_carrier || 'No quote'
    const carrierKeyStr = carrierKeyFromLabel(carrierLabel)
    const carrierLogoSrc = getLogo('carrier', carrierKeyStr) || ''
    const carrierH = defaultCarrierHeights[carrierKeyStr] ?? 20

    const paymentMethodLabel = methodKeyStr.toUpperCase() || '—'

    // ✅ ZMIANA NAZWY NA BARDZIEJ PRECYZYJNĄ
    const title = (
        <>
            Payment Breakdown{' '}
            <span className='opacity-60 text-[13px] font-normal ml-1'>
                ({carrierLabel}, {currency}, {paymentMethodLabel})
            </span>
        </>
    )

    return (
        <UniversalDetailOption title={title} icon={<ScrollText className='w-4 h-4' />} defaultOpen={false}>
            <div className='divide-y divide-middle-blue/10'>
                <MetaRow icon={<Tag className='w-4 h-4 opacity-70' />} label='Products' value={money(breakdown.productsPLN)} />

                <MetaRow
                    icon={<Truck className='w-4 h-4 opacity-70' />}
                    label={
                        <span className='inline-flex items-center gap-3 min-h-[20px]'>
                            Shipping {carrierLogoSrc && <RowLogo src={carrierLogoSrc} heightPx={carrierH} />}
                        </span>
                    }
                    value={money(breakdown.shippingPLN)}
                />

                <MetaRow
                    icon={<Percent className='w-4 h-4 opacity-70' />}
                    label={`Service Fee (${pctLabel(breakdown.serviceFeePct)})`}
                    value={money(breakdown.serviceFeePLN)}
                />

                <MetaRow icon={<Equal className='w-4 h-4 opacity-70' />} label='Subtotal' value={money(breakdown.subtotalPLN)} />

                <MetaRow
                    icon={<TrendingUp className='w-4 h-4 opacity-70' />}
                    label={
                        <span className='inline-flex items-center gap-2 min-h-[14px]'>
                            Payment Fee ({pctLabel(breakdown.paymentFeePct)}){' '}
                            {paymentLogoSrc && <RowLogo src={paymentLogoSrc} heightPx={paymentH} />}
                        </span>
                    }
                    value={money(breakdown.paymentFeePLN)}
                />

                <MetaRow icon={<Calculator className='w-5 h-5' />} label='Total Amount' value={money(breakdown.totalPLN)} bold />
            </div>
        </UniversalDetailOption>
    )
}

/* === Subcomponents === */
function RowLogo({ src, heightPx = 20 }: { src?: string; heightPx?: number }) {
    if (!src) return null
    return (
        <span
            className='inline-flex items-center justify-center shrink-0 align-middle leading-none'
            style={{ height: heightPx }}
        >
            <img
                src={src}
                alt='logo'
                className='block object-contain'
                draggable={false}
                style={{ height: '100%', maxWidth: 120 }}
            />
        </span>
    )
}

function MetaRow({
    icon,
    label,
    value,
    bold,
}: {
    icon: React.ReactNode
    label: React.ReactNode
    value: string
    bold?: boolean
}) {
    return (
        <div className='flex items-center justify-between px-5 h-[56px]'>
            <span className='inline-flex items-center gap-2 text-[13px] leading-none text-middle-blue/70'>
                {icon} {label}
            </span>
            <span
                className={
                    bold
                        ? 'text-[16px] font-heebo_medium tracking-wide text-middle-blue'
                        : 'text-[14px] font-heebo_regular text-middle-blue/90'
                }
            >
                {value}
            </span>
        </div>
    )
}