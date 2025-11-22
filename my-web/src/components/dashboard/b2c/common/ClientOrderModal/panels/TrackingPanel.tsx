// components/dashboard/b2c/common/ClientOrderModal/panels/TrackingPanel.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { LocateFixed, ExternalLink, Copy, Check } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { getLogo } from '@/utils/getLogo'
import type { TrackingPanelDB } from '../clientOrderTypes'

type Props = { items?: TrackingPanelDB[] }

/* === helpers === */
const carrierKeyFromLabel = (label?: string | null) => {
	const raw = String(label || '')
		.toLowerCase()
		.replace(/\s+/g, '')
	const candidates = [raw, raw.replace(/[^a-z0-9]/g, ''), raw.replace(/-/g, '')]
	if (/poczta/.test(raw) || /polishpost/.test(raw)) candidates.unshift('pocztapolska')
	for (const k of candidates) if (getLogo('carrier', k)) return k
	return raw
}

const normalizeUrl = (u?: string | null) => {
	if (!u) return ''
	const s = u.trim()
	if (!s) return ''
	return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

export default function TrackingPanel({ items = [] }: Props) {
	// API zwraca pojedynczy obiekt lub null; modal robi z tego tablicę [obj] / []
	const rows = useMemo(() => (items || []).filter(Boolean), [items])

	return (
		<UniversalDetail
			title='Tracking'
			icon={<LocateFixed className='h-5 w-5' />}
			collapsible
			defaultOpen={true}
			defaultOpenMobile={false}
			className='bg-white border-light-blue'>
			{rows.length === 0 ? (
				<div className='p-4 text-[14px] text-middle-blue/75 bg-middle-blue/3 w-full border border-middle-blue/20 rounded-md'>
					Tracking number not available yet.
				</div>
			) : (
				<div className='divide-y divide-middle-blue/10'>
					{rows.map((t, idx) => (
						<TrackRow key={idx} item={t as NonNullable<TrackingPanelDB>} />
					))}
				</div>
			)}
		</UniversalDetail>
	)
}

function TrackRow({ item }: { item: NonNullable<TrackingPanelDB> }) {
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
		} catch {
			/* ignore */
		}
	}

	return (
		<div className='flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-4 bg-ds-light-blue rounded-md'>
			{/* Lewa strona: logo w linii z nazwą, link pod spodem */}
			<div className='min-w-0 flex-1'>
				<div className='inline-flex items-end gap-2 min-w-0'>
					<span className='text-[15px] md:text-[17px] font-heebo_medium text-middle-blue truncate leading-none'>
						{carrierLabel || '—'}
					</span>
					{logo ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={logo}
							alt={carrierLabel || 'carrier'}
							className='block shrink-0 object-contain'
							draggable={false}
							style={{ height: 18, maxWidth: 90, marginBottom: 1 }}
						/>
					) : null}
				</div>

				{href ? <div className='mt-1 text-[12px] text-middle-blue/70 break-all md:break-words'>{href}</div> : null}
			</div>

			{/* Prawa strona: akcje. Na mobile kompaktowe przyciski. */}
			<div className='flex shrink-0 items-center gap-2 self-stretch md:self-center'>
				<button
					type='button'
					disabled={!href}
					onClick={() => href && window.open(href, '_blank', 'noopener,noreferrer')}
					className='inline-flex h-9 md:h-10 px-3 md:px-4 items-center justify-center rounded-md border
                       border-middle-blue/20 text-middle-blue
                       disabled:opacity-40 disabled:cursor-not-allowed bg-ds-middle-blue
                       hover:border-middle-blue/40 hover:bg-light-blue/60
                       transition-colors duration-200'
					title='Open tracking page'
					aria-label='Open tracking link'>
					<ExternalLink className='w-4 h-4' />
				</button>

				<button
					type='button'
					disabled={!href}
					onClick={copy}
					className='inline-flex h-9 md:h-10 px-3 md:px-4 items-center justify-center rounded-md border
                       border-middle-blue/20 text-middle-blue
                       disabled:opacity-40 disabled:cursor-not-allowed bg-ds-middle-blue
                       hover:border-middle-blue/40 hover:bg-light-blue/60
                       transition-colors duration-200'
					title='Copy link'
					aria-label='Copy tracking link'>
					{copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
				</button>
			</div>
		</div>
	)
}
