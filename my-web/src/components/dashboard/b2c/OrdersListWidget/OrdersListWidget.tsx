'use client'

import React from 'react'
import clsx from 'clsx'
import {
	Hash,
	Globe,
	Calendar,
	ArrowRight,
	ClipboardList,
	type LucideIcon,
	Tag,
	BadgeCheck,
	FileBox,
} from 'lucide-react'
import Flag from '@/components/common/Flag'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

export type CustomerOrder = {
	id: string
	createdAt: string | Date
	status: OrderStatus
	destination?: string
	items?: { name: string; qty: number }[]
}

type Props = {
	orders?: CustomerOrder[]
	onViewAll: () => void
	onOpenOrder?: (orderId: string) => void
}

const fmtDay = (d: string | Date) => {
	if (!d) return '—'
	const date = typeof d === 'string' ? new Date(d) : d
	if (isNaN(date.getTime())) return '—'
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${dd}`
}

type ColKey = 'id' | 'items' | 'status' | 'country' | 'created'
type Column = { key: ColKey; label: string; Icon: LucideIcon; width: string; align: 'left' | 'center' | 'right' }

const COLUMNS: Column[] = [
	{ key: 'id', label: 'Id', Icon: FileBox, width: '12%', align: 'left' },
	{ key: 'items', label: 'Items', Icon: Tag, width: '40%', align: 'left' },
	{ key: 'status', label: 'Status', Icon: BadgeCheck, width: '18%', align: 'center' },
	{ key: 'country', label: 'Country', Icon: Globe, width: '20%', align: 'center' },
	{ key: 'created', label: 'Created', Icon: Calendar, width: '10%', align: 'center' },
]
const thAlign = (a: Column['align']) => (a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center')

export default function OrdersListWidget({ orders = [], onViewAll, onOpenOrder }: Props) {
	const top5 = orders.slice(0, 5)

	return (
		<UniversalDetail
			title='Recent Orders'
			icon={<ClipboardList className='h-5 w-5' />}
			className='bg-white border-light-blue font-heebo_regular text-middle-blue'>
			<div
				className='hidden md:block rounded-lg border border-middle-blue overflow-x-auto mt-3 md:mt-4 min-w-0 select-none'
				tabIndex={-1}>
				<table className='min-w-full table-fixed text-[13px] caret-transparent'>
					<colgroup>
						{COLUMNS.map(c => (
							<col key={c.key} style={{ width: c.width }} />
						))}
					</colgroup>

					<thead>
						<tr className='bg-dark-blue text-white'>
							{COLUMNS.map((c, i) => (
								<th
									key={c.key}
									className={clsx(
										'font-normal tracking-wide select-none text-[12px]',
										thAlign(c.align),
										i === 0 && 'first:rounded-tl-xs',
										i === COLUMNS.length - 1 && 'last:rounded-tr-xs'
									)}>
									<div
										className={clsx(
											'h-[56px] px-6',
											'flex items-center gap-2',
											c.align === 'center' ? 'justify-center' : c.align === 'right' ? 'justify-end' : 'justify-start'
										)}>
										<c.Icon className='h-4 w-4 opacity-90' />
										<span className='opacity-90 truncate'>{c.label}</span>
									</div>
								</th>
							))}
						</tr>
					</thead>

					<tbody className='divide-y divide-ds-border'>
						{top5.length ? (
							top5.map((o, idx) => {
								const cfg = getStatusConfig(o.status)
								const StatusIcon = cfg.icon
								const items =
									(o.items ?? [])
										.slice(0, 3)
										.map(i => `${i.name} ×${i.qty}`)
										.join(', ') + ((o.items?.length ?? 0) > 3 ? ', …' : '')
								const zebra = idx % 2 === 0 ? 'bg-ds-light-blue' : 'bg-white'

								const countryInfo = getCountryInfoByName(o.destination)
								const flagIso = countryInfo?.code
								const countryName = countryInfo?.label ?? o.destination ?? '—'

								return (
									<tr
										key={o.id}
										className={clsx(
											zebra,
											'transition-colors duration-200 hover:bg-ds-hover cursor-pointer text-middle-blue/80'
										)}
										onClick={() => onOpenOrder?.(o.id)}
										onKeyDown={e => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault()
												onOpenOrder?.(o.id)
											}
										}}
										tabIndex={0}
										role='button'>
										<td className='px-6 align-middle'>
											<span className='font-heebo_medium truncate'>{o.id}</span>
										</td>
										<td className='px-6 align-middle'>
											<div className='truncate'>{items || '—'}</div>
										</td>
										<td className='px-6 py-5 align-middle'>
											<div className='flex w-full items-center justify-center'>
												<span
													className='inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] leading-5 border shrink-0'
													style={{ backgroundColor: cfg.bgColor, color: cfg.textColor, borderColor: cfg.textColor }}
													title={cfg.text}>
													<StatusIcon className='h-3.5 w-3.5' aria-hidden />
													<span className='truncate'>{cfg.text}</span>
												</span>
											</div>
										</td>
										<td className='px-6 align-middle'>
											<div className='flex items-center justify-center gap-2'>
												{flagIso ? <Flag iso={flagIso} title={countryName} /> : null}
												<span className='truncate text-center'>{countryName}</span>
											</div>
										</td>
										<td className='text-center tracking-wide px-6'>
											<span className='text-[12px] text-middle-blue/60 tabular-nums'>{fmtDay(o.createdAt)}</span>
										</td>
									</tr>
								)
							})
						) : (
							<tr>
								<td colSpan={COLUMNS.length} className='px-6 py-10 text-center text-middle-blue/70'>
									Brak ostatnich zamówień.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className='md:hidden min-w-0 select-none caret-transparent mt-3' tabIndex={-1}>
				{top5.length ? (
					<div className='flex flex-col gap-2.5'>
						{top5.map(o => {
							const cfg = getStatusConfig(o.status)
							const StatusIcon = cfg.icon

							const countryInfo = getCountryInfoByName(o.destination)
							const flagIso = countryInfo?.code
							const countryName = countryInfo?.label ?? o.destination ?? '—'

							const itemsShort =
								(o.items ?? [])
									.slice(0, 2)
									.map(i => `${i.name} ×${i.qty}`)
									.join(', ') + ((o.items?.length ?? 0) > 2 ? ', …' : '')

							return (
								<div
									key={o.id}
									className='rounded-md border border-middle-blue bg-light-blue/50 min-w-0 overflow-hidden cursor-pointer transition-colors hover:bg-light-blue/35'
									onClick={() => onOpenOrder?.(o.id)}
									onKeyDown={e => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											onOpenOrder?.(o.id)
										}
									}}
									tabIndex={0}
									role='button'>
									<div className='flex items-center justify-between gap-3 px-4 h-[56px] bg-dark-blue border-dark-blue text-white tracking-wide'>
										<div className='flex items-center gap-1.5 min-w-0'>
											<Hash className='h-[13px] w-[13px] opacity-90 shrink-0 ' />
											<span className='truncate text-[12px] tabular-nums leading-[1] align-middle mt-0.5'>{o.id}</span>
										</div>

										<span className='inline-flex items-center gap-1.5 opacity-50'>
											<span className='tabular-nums text-[11px] leading-[1] align-middle translate-y-[0.5px]'>
												{fmtDay(o.createdAt)}
											</span>
											<Calendar className='h-[12px] w-[12px] opacity-90 shrink-0 translate-y-[0.5px]' />
										</span>
									</div>

									<div className='px-4 py-3 border-b border-middle-blue/16'>
										<p className='text-[13px] leading-5 text-middle-blue/80 truncate'>{itemsShort || '—'}</p>
									</div>

									<div className='flex items-center justify-between gap-3 px-4 py-3'>
										<span className='inline-flex items-center gap-2 min-w-0'>
											{flagIso ? <Flag iso={flagIso} title={countryName} /> : null}
											<span className='text-[13px] truncate min-w-0'>{countryName}</span>
										</span>
										<span
											className='inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] leading-5 border shrink-0'
											style={{ backgroundColor: cfg.bgColor, color: cfg.textColor, borderColor: cfg.textColor }}>
											<StatusIcon className='h-3.5 w-3.5' aria-hidden />
											{cfg.text}
										</span>
									</div>
								</div>
							)
						})}
					</div>
				) : (
					<div className='px-1 py-8 text-center text-middle-blue/70'>Brak zamówień.</div>
				)}
			</div>

			<div className='mt-4 flex items-center justify-end select-none'>
				<button
					type='button'
					onClick={onViewAll}
					className='group relative inline-flex items-center rounded-lg border border-ds-border bg-ds-light-blue pl-5 pr-12 py-2 text-[13px] text-middle-blue hover:bg-ds-hover hover:border-middle-blue transition-colors'
					title='View all orders'>
					<span>View all</span>
					<ArrowRight
						className='absolute right-4 h-4 w-4 transition-transform group-hover:translate-x-0.5'
						aria-hidden
					/>
				</button>
			</div>
		</UniversalDetail>
	)
}
