'use client'

import React, { useState } from 'react'
import { LocateFixed, ExternalLink, Copy, Check } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { getLogo } from '@/utils/getLogo'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'

const carrierKeyFromLabel = (label?: string | null) => {
    const raw = String(label || '').toLowerCase().replace(/\s+/g, '')
    if (/poczta/.test(raw) || /polishpost/.test(raw)) return 'pocztapolska'
    return raw.replace(/[^a-z0-9]/g, '')
}

const normalizeUrl = (u?: string | null) => {
    if (!u) return ''
    const s = u.trim()
    if (!s) return ''
    return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

export default function TrackingPanel() {
    const { data } = useClientOrderModalCtx()
    const item = data?.trackingPanel

    return (
        <UniversalDetail
            title='Tracking'
            icon={<LocateFixed className='h-5 w-5' />}
            collapsible
            defaultOpen={false}
            defaultOpenMobile={false}
            className='bg-white border-light-blue'
        >
            <div className='divide-y divide-middle-blue/10'>
                {item ? (
                    <TrackRow item={item} />
                ) : (
                    // ✅ PLACEHOLDER: To się pokaże, jak wymusisz tracking a nie ma danych
                    <div className='p-4 text-[13px] text-middle-blue/70 bg-ds-light-blue rounded-md border border-middle-blue/10 flex flex-col gap-1'>
                        <span className='font-heebo_medium text-middle-blue'>No tracking yet</span>
                        <span>Tracking info will appear here once shipped.</span>
                    </div>
                )}
            </div>
        </UniversalDetail>
    )
}

function TrackRow({ item }: { item: { selected_carrier?: string | null, selected_tracking_link?: string | null } }) {
    const carrierLabel = item.selected_carrier || ''
    const carrierKey = carrierKeyFromLabel(carrierLabel)
    const logo = carrierKey ? getLogo('carrier', carrierKey) : ''
    const href = normalizeUrl(item.selected_tracking_link)

    const [copied, setCopied] = useState(false)
    const copy = async () => {
        if (!href) return
        try {
            await navigator.clipboard.writeText(href)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
        } catch { /* ignore */ }
    }

    return (
        <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-4 bg-ds-light-blue rounded-md'>
            <div className='min-w-0 flex-1'>
                <div className='inline-flex items-end gap-2 min-w-0'>
                    <span className='text-[15px] md:text-[17px] font-heebo_medium text-middle-blue truncate leading-none'>
                        {carrierLabel || 'Shipment'}
                    </span>
                    {logo && (
                        <img src={logo} alt={carrierLabel} className='block shrink-0 object-contain' draggable={false} style={{ height: 18, maxWidth: 90, marginBottom: 1 }} />
                    )}
                </div>
                {href && <div className='mt-1 text-[12px] text-middle-blue/70 break-all md:break-words'>{href}</div>}
            </div>

            <div className='flex shrink-0 items-center gap-2 self-stretch md:self-center'>
                <button
                    type='button'
                    disabled={!href}
                    onClick={() => href && window.open(href, '_blank', 'noopener,noreferrer')}
                    className='inline-flex h-9 md:h-10 px-3 md:px-4 items-center justify-center rounded-md border border-middle-blue/20 text-middle-blue disabled:opacity-40 disabled:cursor-not-allowed bg-ds-middle-blue hover:border-middle-blue/40 hover:bg-light-blue/60 transition-colors duration-200'
                    title='Open page'
                >
                    <ExternalLink className='w-4 h-4' />
                </button>

                <button
                    type='button'
                    disabled={!href}
                    onClick={copy}
                    className='inline-flex h-9 md:h-10 px-3 md:px-4 items-center justify-center rounded-md border border-middle-blue/20 text-middle-blue disabled:opacity-40 disabled:cursor-not-allowed bg-ds-middle-blue hover:border-middle-blue/40 hover:bg-light-blue/60 transition-colors duration-200'
                    title='Copy link'
                >
                    {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                </button>
            </div>
        </div>
    )
}