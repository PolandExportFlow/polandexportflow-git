'use client'

import React from 'react'
import clsx from 'clsx'
import {
	Hash,
	Globe,
	Calendar,
	Tag,
	BadgeCheck,
	ChevronLeft,
	ChevronRight,
	type LucideIcon,
	FileBox,
} from 'lucide-react'
import Flag from '@/components/common/Flag'
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'
import type { CustomerOrder } from '../OrdersListWidget/OrdersListWidget'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

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

type Props = {
	orders: CustomerOrder[]
	loading?: boolean
	onOpenOrder: (orderId: string) => void
	page: number
	totalPages: number
	onPageChange: (page: number) => void
	search: string
	onSearchChange: (val: string) => void
}

export default function OrdersTable({
	orders,
	loading,
	onOpenOrder,
	page,
	totalPages,
	onPageChange,
	search,
	onSearchChange,
}: Props) {
	return (
		<div className='min-w-0 select-none'>
			<div className='rounded-lg border border-middle-blue overflow-hidden'>
				<div className='px-4 py-3 bg-dark-blue border-b border-dark-blue'>
					<input
						type='text'
						placeholder='Search by ID, status, or country...'
						value={search}
						onChange={e => onSearchChange(e.target.value)}
						className='w-full md:w-1/2 h-12 px-4 rounded-md border border-middle-blue/40
             text-[13px] placeholder:text-[13px] text-middle-blue
             focus:border-middle-blue outline-none'
					/>
				</div>

				<div className='hidden md:block overflow-x-auto' tabIndex={-1}>
					<table className='min-w-full table-fixed text-[13px] caret-transparent'>
						<colgroup>
							{COLUMNS.map(c => (
								<col key={c.key} style={{ width: c.width }} />
							))}
						</colgroup>

						<thead>
							<tr className='bg-dark-blue text-white'>
								{COLUMNS.map(c => (
									<th
										key={c.key}
										className={clsx('font-normal tracking-wide select-none text-[12px]', thAlign(c.align))}>
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
							{loading ? (
								<tr>
									<td colSpan={COLUMNS.length} className='px-6 py-10 text-center text-middle-blue/70'>
										Loading…
									</td>
								</tr>
							) : orders.length ? (
								orders.map((o, idx) => {
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
											onClick={() => onOpenOrder(o.id)}
											onKeyDown={e => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault()
													onOpenOrder(o.id)
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
											<td className='text-center tracking-wide'>
												<span className='text-[12px] text-middle-blue/60 tabular-nums'>{fmtDay(o.createdAt)}</span>
											</td>
										</tr>
									)
								})
							) : (
								<tr>
									<td colSpan={COLUMNS.length} className='px-6 py-10 text-center text-middle-blue/70'>
										No orders yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className='md:hidden min-w-0 select-none caret-transparent bg-white' tabIndex={-1}>
					{loading ? (
						<div className='px-1 py-8 text-center text-middle-blue/70'>Loading…</div>
					) : orders.length ? (
						<div className='flex flex-col gap-2.5 px-4 py-3'>
							{orders.map(o => {
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
										onClick={() => onOpenOrder(o.id)}
										onKeyDown={e => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault()
												onOpenOrder(o.id)
											}
										}}
										tabIndex={0}
										role='button'>
										<div className='flex items-center justify-between gap-3 px-4 h-[56px] bg-dark-blue border-dark-blue text-white tracking-wide'>
											<div className='flex items-center gap-1.5 min-w-0'>
												<Hash className='h-[13px] w-[13px] opacity-90 shrink-0' />
												<span className='truncate text-[12px] tabular-nums leading-[1] align-middle mt-0.5'>
													{o.id}
												</span>
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
						<div className='px-1 py-8 text-center text-middle-blue/70'>No orders yet.</div>
					)}
				</div>

				{totalPages > 1 && (
					<div className='flex justify-center items-center gap-3 py-4 bg-white border-t border-middle-blue/20'>
						<button
							type='button'
							onClick={() => onPageChange(Math.max(1, page - 1))}
							disabled={page === 1}
							className='p-2 rounded-lg border border-ds-border bg-ds-light-blue text-middle-blue hover:bg-ds-hover disabled:opacity-40'
							title='Prev'>
							<ChevronLeft className='w-4 h-4' />
						</button>
						<span className='text-[13px] text-middle-blue/70'>
							Page {page} of {totalPages}
						</span>
						<button
							type='button'
							onClick={() => onPageChange(Math.min(totalPages, page + 1))}
							disabled={page === totalPages}
							className='p-2 rounded-lg border border-ds-border bg-ds-light-blue text-middle-blue hover:bg-ds-hover disabled:opacity-40'
							title='Next'>
							<ChevronRight className='w-4 h-4' />
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
