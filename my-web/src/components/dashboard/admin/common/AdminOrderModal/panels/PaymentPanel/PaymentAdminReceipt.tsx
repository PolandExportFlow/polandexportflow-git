'use client'

import React, { useMemo } from 'react'
import { Truck, Percent, TrendingUp, Calculator, Tag, Equal, ScrollText } from 'lucide-react'
import UniversalDetailOption from '@/components/ui/UniversalDetailOption'
import { getLogo } from '@/utils/getLogo'

/** Wszystkie wartości w PLN – tu tylko wyświetlamy w wybranej walucie. */
export type AdminCheckoutBreakdown = {
	productsPLN: number
	shippingPLN: number
	serviceFeePct: number
	serviceFeePLN: number
	subtotalPLN: number
	paymentFeePct: number
	paymentFeePLN: number
	totalPLN: number
}

type Props = {
	currency?: string
	breakdown: AdminCheckoutBreakdown
	methodKey: string
	carrierLabel?: string | null
	fxRates?: Record<string, number>
}

/* === Helpers === */
const pctLabel = (v?: number | null) => (v == null || isNaN(v) ? '—' : `${(+v).toFixed(2).replace(/\.?0+$/, '')}%`)

const carrierKeyFromLabel = (label?: string | null): string => {
	const raw = String(label ?? '')
		.toLowerCase()
		.replace(/\s+/g, '')
	if (/poczta/.test(raw) || /polishpost/.test(raw)) return 'pocztapolska'
	const cleaned = raw.replace(/[^a-z0-9]/g, '')
	return cleaned || raw
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
const defaultPaymentHeights: Record<string, number> = { paypal: 16, revolut: 16, wise: 16, zen: 16 }

function RowLogo({ src, heightPx = 20 }: { src?: string; heightPx?: number }) {
	if (!src) return null
	return (
		<span
			className='inline-flex items-center justify-center shrink-0 align-middle leading-none'
			style={{ height: heightPx }}>
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
				}>
				{value}
			</span>
		</div>
	)
}

export default function PaymentAdminReceipt({
	currency = 'PLN',
	breakdown,
	methodKey,
	carrierLabel,
	fxRates = { PLN: 1 },
}: Props) {
	const cur = String(currency || 'PLN').toUpperCase()
	const rate = cur === 'PLN' ? 1 : fxRates[cur] || 1 // ile PLN kosztuje 1 jednostka waluty

	// PLN -> waluta (dzielimy przez kurs)
	const fromPLN = useMemo(() => (pln: number) => cur === 'PLN' ? pln : rate > 0 ? pln / rate : pln, [cur, rate])

	const money = useMemo(
		() => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: cur as any, maximumFractionDigits: 2 }),
		[cur]
	)

	// logotyp płatności
	const methodKeyStr = String(methodKey || 'paypal').toLowerCase()
	const paymentLogoSrc = getLogo('payment', methodKeyStr) || ''
	const paymentH = defaultPaymentHeights[methodKeyStr] ?? 16

	// logotyp przewoźnika
	const cKey = carrierKeyFromLabel(carrierLabel)
	const carrierLogoSrc = getLogo('carrier', cKey) || ''
	const carrierH = defaultCarrierHeights[cKey] ?? 20

	const title = (
		<>
			Service Receipt
			<span className='opacity-70 text-[13px]'>
				({carrierLabel || 'No quote'}, {cur}, {methodKeyStr.toUpperCase()})
			</span>
		</>
	)

	return (
		<UniversalDetailOption title={title} icon={<ScrollText className='w-4 h-4' />} defaultOpen={false}>
			<div className='divide-y divide-middle-blue/10'>
				<MetaRow
					icon={<Tag className='w-4 h-4 opacity-70' />}
					label='Products'
					value={money.format(fromPLN(breakdown.productsPLN))}
				/>

				<MetaRow
					icon={<Truck className='w-4 h-4 opacity-70' />}
					label={
						<span className='inline-flex items-center gap-3 min-h-[20px]'>
							Shipping {carrierLogoSrc && <RowLogo src={carrierLogoSrc} heightPx={carrierH} />}
						</span>
					}
					value={money.format(fromPLN(breakdown.shippingPLN))}
				/>

				<MetaRow
					icon={<Percent className='w-4 h-4 opacity-70' />}
					label={`Service Fee (${pctLabel(breakdown.serviceFeePct)})`}
					value={money.format(fromPLN(breakdown.serviceFeePLN))}
				/>

				<MetaRow
					icon={<Equal className='w-4 h-4 opacity-70' />}
					label='Subtotal'
					value={money.format(fromPLN(breakdown.subtotalPLN))}
				/>

				<MetaRow
					icon={<TrendingUp className='w-4 h-4 opacity-70' />}
					label={
						<span className='inline-flex items-center gap-2 min-h-[14px]'>
							Payment Fee ({pctLabel(breakdown.paymentFeePct)}){' '}
							{paymentLogoSrc && <RowLogo src={paymentLogoSrc} heightPx={paymentH} />}
						</span>
					}
					value={money.format(fromPLN(breakdown.paymentFeePLN))}
				/>

				<MetaRow
					icon={<Calculator className='w-5 h-5' />}
					label='Total Amount'
					value={money.format(fromPLN(breakdown.totalPLN))}
					bold
				/>
			</div>
		</UniversalDetailOption>
	)
}
