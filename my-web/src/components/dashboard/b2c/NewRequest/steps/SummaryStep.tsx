'use client'

import React, { useMemo, useEffect, useState } from 'react'
import {
	FileCheck,
	PackagePlus,
	MapPin,
	Tag,
	Truck,
	ShoppingCart, // Używana ikona dla Assisted Purchase
	Grid3x3,
	Scale,
	Ruler,
	StickyNote,
	Images,
	Link2,
	User,
	Phone,
	DollarSign,
	Home,
	Building2,
	Mail,
	Hash,
} from 'lucide-react'
import UniversalStep from '../common/UniversalStep'
import Flag from '@/components/common/Flag'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import type { Item } from './ItemsStep'
import type { AddressModel, ServiceType } from '../requestTypes'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

/* ===== Helpers (bez zmian) ===== */
function getQty(q: unknown) {
	const raw = String(q ?? '').trim()
	if (!raw) return 1
	const onlyDigits = raw.replace(/[^\d]/g, '')
	const n = onlyDigits === '' ? NaN : parseInt(onlyDigits, 10)
	if (Number.isNaN(n)) return 1
	return Math.max(1, Math.floor(n))
}
function num(v: unknown): number {
	const s = String(v ?? '').trim()
	if (!s) return 0
	const n = Number(s.replace(',', '.'))
	return Number.isFinite(n) ? n : 0
}

function Row({
	icon: Icon,
	left,
	right,
	withDivider = true,
}: {
	icon: React.ElementType
	left?: React.ReactNode
	right?: React.ReactNode
	withDivider?: boolean
}) {
	return (
		<div className={withDivider ? 'py-3 md:py-3.5 border-t border-middle-blue/6' : 'py-3 md:py-3.5'}>
			<div className='flex items-start gap-2.5 px-2 md:px-3'>
				<Icon className='h-4 w-4 shrink-0 text-middle-blue/75 mt-[1px]' />
				<div className='grid grid-cols-[auto_1fr] items-start gap-x-2 min-w-0 text-[12px] md:text-[13px] leading-[1.5]'>
					{left ? <span className='text-middle-blue/70 whitespace-nowrap'>{left}</span> : null}
					{right ? <span className='font-heebo_medium text-middle-blue/95 break-words'>{right}</span> : null}
				</div>
			</div>
		</div>
	)
}

function StatCell({
	icon: Icon,
	label,
	value,
	align = 'left',
}: {
	icon: React.ElementType
	label: string
	value: React.ReactNode
	align?: 'left' | 'center' | 'right'
}) {
	const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
	return (
		<div className={`flex items-center ${justify} gap-2 min-w-0`}>
			<Icon className='h-3.5 w-3.5 text-middle-blue/70 shrink-0' />
			<span className='text-middle-blue/70 truncate'>{label}:</span>
			<span className='font-heebo_medium text-middle-blue/95 truncate'>{value}</span>
		</div>
	)
}

function TotalsBarDesktop({
	itemsCount,
	quantity,
	totalValue,
}: {
	itemsCount: number
	quantity: number
	totalValue: string
}) {
	return (
		<div
			className='hidden md:grid grid-cols-3 items-center gap-0 divide-x divide-middle-blue/15 rounded-md px-4 py-3 text-[13px]'
			role='list'>
			<div className='pr-4' role='listitem'>
				<StatCell icon={Tag} label='Total Items' value={itemsCount} />
			</div>
			<div className='px-4' role='listitem'>
				<StatCell icon={Grid3x3} label='Total Quantity' value={quantity} align='center' />
			</div>
			<div className='pl-4' role='listitem'>
				<StatCell icon={DollarSign} label='Total Value' value={totalValue} align='right' />
			</div>
		</div>
	)
}

function ItemInfoBarDesktop({
	productLink,
	quantity,
	weight,
	size,
}: {
	productLink?: string | null
	quantity: number
	weight?: string
	size?: string
}) {
	return (
		<div className='hidden md:grid grid-cols-4 items-center gap-0 divide-x divide-middle-blue/15 text-[13px]'>
			<div className='pr-4 min-w-0'>
				<div className='flex items-center gap-2 min-w-0'>
					<Link2 className='h-3.5 w-3.5 text-middle-blue/70 shrink-0' />
					<span className='text-middle-blue/70'>Link:</span>
					{productLink ? (
						<a
							href={productLink}
							target='_blank'
							rel='noreferrer'
							className='font-heebo_medium text-middle-blue/95 truncate hover:underline'
							title={productLink}>
							{productLink}
						</a>
					) : (
						<span className='font-heebo_medium text-middle-blue/95'>—</span>
					)}
				</div>
			</div>
			<div className='px-4'>
				<div className='flex items-center justify-center gap-2'>
					<Grid3x3 className='h-3.5 w-3.5 text-middle-blue/70 shrink-0' />
					<span className='text-middle-blue/70'>Quantity:</span>
					<span className='font-heebo_medium text-middle-blue/95'>{quantity}</span>
				</div>
			</div>
			<div className='px-4'>
				<div className='flex items-center justify-center gap-2'>
					<Scale className='h-3.5 w-3.5 text-middle-blue/70 shrink-0' />
					<span className='text-middle-blue/70'>Weight:</span>
					<span className='font-heebo_medium text-middle-blue/95'>{weight ?? '—'}</span>
				</div>
			</div>
			<div className='pl-4 min-w-0'>
				<div className='flex items-center justify-center gap-2 min-w-0'>
					<Ruler className='h-3.5 w-3.5 text-middle-blue/70 shrink-0' />
					<span className='text-middle-blue/70'>Size:</span>
					<span className='font-heebo_medium text-middle-blue/95 truncate' title={size}>
						{size ?? '—'}
					</span>
				</div>
			</div>
		</div>
	)
}

function ThumbGrid({ files }: { files: File[] }) {
	const [urls, setUrls] = useState<string[]>([])
	const [selected, setSelected] = useState<string | null>(null)

	useEffect(() => {
		const u = files.map(f => URL.createObjectURL(f))
		setUrls(u)
		return () => u.forEach(URL.revokeObjectURL)
	}, [files])

	if (!urls.length) return null

	return (
		<>
			<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
				{urls.map((u, i) => (
					<button
						key={i}
						type='button'
						onClick={() => setSelected(u)}
						title='Click to preview'
						className='group relative aspect-square overflow-hidden rounded-md bg-white
                                     border border-middle-blue/15 hover:border-middle-blue/40
                                     ring-1 ring-transparent hover:ring-middle-blue/10
                                     transition cursor-zoom-in'>
						<img
							src={u}
							alt={`Item image ${i + 1}`}
							className='h-full w-full object-cover transition group-hover:brightness-60'
						/>
					</button>
				))}
			</div>

			<UniversalImageModal selectedPhoto={selected} onClose={() => setSelected(null)} />
		</>
	)
}

export default function SummaryStep({
    service,
    address,
    items = [],
    orderNote,
    onChangeOrderNote,
    onBack,
    onSubmit,
    isCreatingOrder, // <-- DODANA TA LINIA
    isUploading,    // <-- DODANA TA LINIA
}: {
    service?: ServiceType
    address: AddressModel
    items?: Item[]
    orderNote?: string
    onChangeOrderNote?: (v: string) => void
    onBack?: () => void
    onSubmit?: () => void
    isCreatingOrder?: boolean // <-- DODANA TA LINIA
    isUploading?: boolean    // <-- DODANA TA LINIA
}) {
	const totals = useMemo(() => {
		const itemsCount = items.length
		const quantity = items.reduce((s, i) => s + getQty(i.item_quantity), 0)
		const totalValue = items.reduce((s, i) => s + num(i.item_value), 0)
		return { itemsCount, quantity, totalValue }
	}, [items])

	const serviceLabel = service || ''

	// ZMIANA: Zastąpienie 'Personal Shipping' przez 'Assisted Purchase'
	const ServiceIcon = service === 'Parcel Forwarding' ? Truck : service === 'Assisted Purchase' ? ShoppingCart : null

	// Używamy helpera do znalezienia KODU ISO na podstawie PEŁNEJ NAZWY
	const countryName = address?.order_country
	const countryInfo = useMemo(() => getCountryInfoByName(countryName), [countryName])
	const countryCode = countryInfo?.code // Kod ISO dla flagi

	return (
		<UniversalStep
			icon={<FileCheck className='h-6 w-6 md:w-7 md:h-7 text-middle-blue' />}
			title='Review & confirm'
			onBack={onBack}
			onContinue={onSubmit}
			continueLabel={'Submit'}
			contentClassName='space-y-2 md:space-y-3'>
			{/* Service */}
			<section className='rounded-lg border border-middle-blue/15 bg-ds-light-blue p-3 md:p-5'>
				<header className='flex items-center gap-3.5 mb-2.5'>
					<div className='w-10 h-10 shrink-0 rounded-md grid place-items-center bg-middle-blue/8 pointer-events-none'>
						<PackagePlus className='h-4 w-4 text-middle-blue' />
					</div>
					<h3>Service Type</h3>
				</header>

				{serviceLabel ? (
					<div className='flex flex-col gap-3'>
						<div className='flex items-center gap-2.5 md:gap-4 text-[12px] md:text-[14px] text-middle-blue/90 p-3.5 md:p-4 font-heebo_medium bg-ds-middle-blue rounded-md'>
							{ServiceIcon && (
								<span className='inline-grid place-items-center h-8 w-8 rounded-full bg-middle-blue/10 ring-1 ring-middle-blue/15'>
									<ServiceIcon className='h-4 w-4 text-middle-blue' aria-hidden />
								</span>
							)}
							<span>{serviceLabel}</span>
						</div>
						<div className='flex flex-col bg-ds-middle-blue p-3 rounded-md'>
							<label className='text-[12px] inline-flex items-center gap-2 opacity-80 p-1'>
								<StickyNote className='h-3.5 w-3.5' />
								Additional information for order (optional)
							</label>
							<textarea
								value={orderNote ?? ''}
								onChange={e => onChangeOrderNote?.(e.target.value)}
								placeholder='Any special info for this order (not delivery notes)…'
								className='w-full rounded-md border border-middle-blue/15 bg-white p-3 md:p-4 text-dark-blue outline-none min-h-[80px]'
							/>
						</div>
					</div>
				) : null}
			</section>

			{/* Address */}
			<section className='rounded-lg border border-middle-blue/15 bg-ds-light-blue p-3 md:p-5'>
				<header className='flex items-center gap-3.5 mb-2.5'>
					<div className='w-10 h-10 shrink-0 rounded-md grid place-items-center bg-middle-blue/8 pointer-events-none'>
						<MapPin className='h-4 w-4 text-middle-blue' />
					</div>
					<h3>Delivery address</h3>
				</header>

				<div className='rounded-md px-3 md:px-4 p-2 bg-ds-middle-blue'>
					{address?.order_fullname ? (
						<Row icon={User} left='Name:' right={address.order_fullname} withDivider={false} />
					) : null}
					{address?.order_phone ? <Row icon={Phone} left='Phone:' right={address.order_phone} /> : null}
					{countryName ? (
						<Row
							icon={MapPin}
							left='Country:'
							right={
								<span className='inline-flex items-center gap-2'>
									{countryCode && <Flag iso={countryCode} size={16} title={countryName} />}
									{countryName}
								</span>
							}
						/>
					) : null}
					{address?.order_street?.trim() ? <Row icon={Home} left='Street:' right={address.order_street} /> : null}
					{address?.order_house_number?.toString().trim() ? (
						<Row icon={Hash} left='House / Apt:' right={address.order_house_number} />
					) : null}
					{address?.order_city?.trim() ? <Row icon={Building2} left='City:' right={address.order_city} /> : null}
					{address?.order_postal_code?.trim() ? (
						<Row icon={Mail} left='Postal code:' right={address.order_postal_code} />
					) : null}
					{address?.order_delivery_notes?.trim() ? (
						<Row icon={StickyNote} left='Delivery notes:' right={address.order_delivery_notes} />
					) : null}
				</div>
			</section>

			{/* Items */}
			<section className='rounded-lg border border-middle-blue/15 bg-ds-light-blue p-3 md:p-6'>
				<div className='flex items-center gap-3.5 mb-3'>
					<div className='w-10 h-10 shrink-0 rounded-md grid place-items-center bg-middle-blue/8 pointer-events-none'>
						<Tag className='h-4 w-4 text-middle-blue' />
					</div>
					<h3>Shipment contents</h3>
				</div>

				<div className='rounded-md px-3 md:px-4 p-2 bg-ds-middle-blue'>
					<div className='md:hidden'>
						<Row icon={Tag} left='Total Items:' right={totals.itemsCount} withDivider={false} />
						<Row icon={Grid3x3} left='Total Quantity:' right={totals.quantity} />
						<Row icon={DollarSign} left='Total Value:' right={`${totals.totalValue.toFixed(2)} PLN`} />
					</div>
					<TotalsBarDesktop
						itemsCount={totals.itemsCount}
						quantity={totals.quantity}
						totalValue={`${totals.totalValue.toFixed(2)} PLN`}
					/>
				</div>

				<div className='space-y-3 mt-3'>
					{items.length === 0 ? (
						<div className='text-[12px] md:text-[13px] text-middle-blue/70 py-2'>No items added.</div>
					) : (
						items.map((it, idx) => {
							const haveDims = it.item_length || it.item_width || it.item_height
							const price = num(it.item_value)
							const qty = getQty(it.item_quantity)

							const weightStr = it.item_weight ? `${it.item_weight} kg` : undefined
							const sizeStr = haveDims
								? `${it.item_length || '—'}×${it.item_width || '—'}×${it.item_height || '—'} cm`
								: undefined

							return (
								<div key={it.id} className='bg-ds-middle-blue rounded-md p-3 py-4 md:p-8'>
									<div className='flex w-full items-start justify-between gap-3 px-2 pb-4 text-[14px] text-middle-blue font-heebo_medium border-b border-middle-blue/6 md:mb-6'>
										<div className='flex flex-1 min-w-0 items-start gap-3 leading-snug'>
											<span className='shrink-0'>#{idx + 1}</span>
											<span className='min-w-0 whitespace-normal break-words'>{it.item_name || ''}</span>
										</div>
										<span className='shrink-0 self-start text-right'>{price.toFixed(2)} PLN</span>
									</div>

									<div className='md:hidden'>
										<Row
											icon={Link2}
											left='Link:'
											right={
												it.item_url ? (
													<a
														href={it.item_url}
														target='_blank'
														rel='noreferrer'
														className='text-middle-blue hover:underline'>
														{it.item_url}
													</a>
												) : (
													'—'
												)
											}
											withDivider={false}
										/>
										<Row icon={Grid3x3} left='Quantity:' right={qty} />
										{it.item_note ? <Row icon={StickyNote} left='Note:' right={it.item_note} /> : null}
										{weightStr ? <Row icon={Scale} left='Weight:' right={weightStr} /> : null}
										{sizeStr ? <Row icon={Ruler} left='Size:' right={sizeStr} /> : null}
									</div>

									<div className='hidden md:block'>
										<ItemInfoBarDesktop productLink={it.item_url} quantity={qty} weight={weightStr} size={sizeStr} />
										{it.item_note ? (
											<div className='border-t border-middle-blue/6 py-3 pt-5 mt-3 md:mt-6'>
												<div className='flex items-start gap-2.5 px-1 text-[13px] leading-[1.5]'>
													<StickyNote className='h-3.5 w-3.5 text-middle-blue/70 shrink-0 mt-[2px]' />
													<div className='grid grid-cols-[auto_1fr] items-start gap-x-2 min-w-0'>
														<span className='text-middle-blue/70 whitespace-nowrap'>Note:</span>
														<span className='font-heebo_medium text-middle-blue/95 break-words'>{it.item_note}</span>
													</div>
												</div>
											</div>
										) : null}
									</div>

									{it.files && it.files.length > 0 ? (
										<div className='px-2 md:px-0'>
											<div className='py-3.5 md:py-4 inline-flex items-center gap-2 text-[12px] md:text-[13px] text-middle-blue/85 border-t-1 border-middle-blue/6 mt-3 md:mt-6 w-full'>
												<Images className='h-3.5 w-3.5 text-middle-blue/70' />
												<span className='text-middle-blue/70 '>
													Product images:
													<b className='ml-1.5 font-heebo_medium text-middle-blue/95'>({it.files.length})</b>
												</span>
											</div>

											<ThumbGrid files={it.files} />
										</div>
									) : null}
								</div>
							)
						})
					)}
				</div>
			</section>
		</UniversalStep>
	)
}
