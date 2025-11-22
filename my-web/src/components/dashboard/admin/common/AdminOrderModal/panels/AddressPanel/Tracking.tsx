// app/admin/components/sections/orders/panels/AddressPanel/Tracking.tsx
'use client'

import React, { useMemo } from 'react'
import { Truck, Banknote, ExternalLink, Copy, Link2, Check } from 'lucide-react'
import { getLogo } from '@/utils/getLogo'
import { useTracking } from '../../hooks/useTracking'

type CarrierInfo = { name: string; key?: string }

type Props = {
    /** id lub order_number (lookup do RPC) */
    orderLookup: string
    carrier?: CarrierInfo | null
    /** inicjalny kod z backendu (selected_tracking_link) */
    trackingCode?: string
    quotedShipping?: number | null
}

export default function Tracking({
    orderLookup,
    carrier,
    trackingCode: trackingCodeProp = '',
    quotedShipping = null,
}: Props) {
    // przewoźnik: label + logo
    const { carrierName, carrierLogo, carrierKey } = useMemo(() => {
        if (!carrier) return { carrierName: 'brak', carrierLogo: '', carrierKey: '' }
        const label = carrier.name?.trim() || 'Brak'
        const raw = (carrier.key || label).toLowerCase()
        const tries = [raw, raw.replace(/\s+/g, ''), raw.replace(/[^a-z0-9]/g, '')]
        for (const t of tries) {
            const src = getLogo('carrier', t)
            if (src) return { carrierName: label, carrierLogo: src, carrierKey: t }
        }
        return { carrierName: label, carrierLogo: '', carrierKey: raw }
    }, [carrier])

    // tracking hook (RAW code; link tylko do UI)
    const tr = useTracking({
        lookup: orderLookup,
        carrierKeyOrName: carrierKey || carrierName,
        initialCode: trackingCodeProp,
        autoSave: true,
        debounceMs: 600,
    })

    const quotedDisplay = `${Number((quotedShipping ?? 0).toFixed(2)).toFixed(2)} zł`

    const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
        <div className='flex items-center gap-2 text-[12px] font-heebo_medium text-middle-blue/70 select-none tracking-wide mb-4'>
            <span className='inline-flex h-4 w-4 items-center justify-center opacity-70'>{icon}</span>
            <span>{children}</span>
        </div>
    )

    // USUNIĘTO 'border-t border-light-blue' z poniższego div
    return (
        <div className='space-y-9 p-8 mt-4 bg-ds-light-blue rounded-md'>
            {/* Wybrany przewoźnik */}
            <div className='space-y-2'>
                <SectionTitle icon={<Truck className='w-4 h-4' />}>Wybrany przewoźnik</SectionTitle>
                <div className='flex items-center gap-6'>
                    <span className='text-[14px] font-heebo_medium'>{carrierName || 'brak metody wysyłki'}</span>
                    {carrierLogo ? (
                        <span className='inline-flex items-center justify-center h-6'>
                            <img
                                src={carrierLogo}
                                alt={carrierName}
                                className='block max-h-6 w-auto max-w-[110px] object-contain select-none'
                                draggable={false}
                            />
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Kod śledzenia (RAW code → baza) */}
            <div className='space-y-2'>
                <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-2 text-[12px] font-heebo_medium text-middle-blue/70 select-none tracking-wide'>
                        <span className='inline-flex h-4 w-4 items-center justify-center opacity-70'>
                            <Link2 className='w-4 h-4' />
                        </span>
                        <span>Kod śledzenia</span>
                    </div>
                    <div className='pl-4 text-right min-w-[120px]'>
                        {tr.saving ? (
                            <span className='text-[11px] opacity-60 leading-none'>zapisywanie…</span>
                        ) : tr.saved ? (
                            <span className='inline-flex items-center gap-1 text-[11px] text-green-600 leading-none'>
                                <Check className='w-3 h-3 shrink-0' />
                                <span className='leading-none'>zapisano</span>
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    <input
                        value={tr.code}
                        onChange={e => tr.setCode(e.target.value)}
                        onBlur={tr.onBlur}
                        onKeyDown={tr.onKeyDown}
                        placeholder='Wklej kod śledzenia…'
                        className='flex-1 min-w-0 w-full rounded-lg border bg-white px-3 py-2.5 text-[14px] outline-none shadow-none border-light-blue focus:ring-2 focus:ring-light-blue/50'
                    />
                    <button
                        type='button'
                        disabled={!tr.link}
                        title='Otwórz stronę śledzenia'
                        onClick={() => {
                            if (tr.link) window.open(tr.link, '_blank', 'noopener,noreferrer')
                        }}
                        className='inline-flex items-center justify-center h-[42px] px-3 rounded-md border border-light-blue text-middle-blue
                         disabled:opacity-40 disabled:cursor-not-allowed hover:bg-middle-blue/10'>
                        <ExternalLink className='w-4 h-4' />
                    </button>
                    <button
                        type='button'
                        disabled={!tr.link}
                        title='Kopiuj link'
                        onClick={async () => {
                            if (tr.link) await navigator.clipboard.writeText(tr.link)
                        }}
                        className='inline-flex items-center justify-center h-[42px] px-3 rounded-md border border-light-blue text-middle-blue
                         disabled:opacity-40 disabled:cursor-not-allowed hover:bg-middle-blue/10'>
                        <Copy className='w-4 h-4' />
                    </button>
                </div>
                {tr.link ? <div className='mt-3 text-xs opacity-70 break-all'>{tr.link}</div> : null}
            </div>

            {/* Koszt przewoźnika */}
            <div className='space-y-2'>
                <SectionTitle icon={<Banknote className='w-4 h-4' />}>Koszt przewoźnika</SectionTitle>
                <div className='flex items-center gap-2'>
                    <span className='text-[14px] leading-6 font-heebo_medium tabular-nums'>{quotedDisplay}</span>
                </div>
            </div>
        </div>
    )
}