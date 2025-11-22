'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
	Eye,
	Truck,
	Hash,
	User,
	Globe,
	BadgeCheck,
	Banknote,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	Check,
	RefreshCcw,
	type LucideIcon,
} from 'lucide-react'
import type { ListCtrl, SortKey } from './useB2CList'
import type { B2COrder } from './B2CTypes'
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'
import Flag from '@/components/common/Flag'
import { fmtDate } from '@/utils/datetime'
import AdminProfileModal from '../../../common/AdminProfileModal/AdminProfileModal'
import AdminOrderModal from '../../../common/AdminOrderModal/AdminOrderModal'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

type Props = { list: ListCtrl }

type Column = {
	key:
		| 'id'
		| 'country'
		| 'order_fullname'
		| 'status'
		| 'received_pln'
		| 'cost_pln'
		| 'profit_pln'
		| 'created_at'
		| 'actions'
	label: string
	icon?: LucideIcon
	width?: string
	fixedPx?: number
	align?: 'left' | 'center' | 'right'
	sortable?: boolean
}

const PLN = (n: number) => `${n.toFixed(2)} zł`

export default function B2CList({ list }: Props) {
	const [showPageSize, setShowPageSize] = useState(false)
	const [profileIdForModal, setProfileIdForModal] = useState<string | null>(null)
	const [orderIdForModal, setOrderIdForModal] = useState<string | null>(null)

	type EditMap = Record<string, { received_pln: number; cost_pln: number }>
	const initialEdits: EditMap = useMemo(() => {
		const map: EditMap = {}
		list.data.forEach((row: B2COrder) => {
			// Używamy pól z bazy danych
			map[row.id] = { received_pln: row.admin_amount_received, cost_pln: row.admin_amount_costs }
		})
		return map
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [list.data.map(r => r.id).join('|')])

	const [edits, setEdits] = useState<EditMap>(initialEdits)

	useEffect(() => {
		setEdits(prev => {
			const next = { ...prev }
			list.data.forEach((row: B2COrder) => {
				// Używamy pól z bazy danych
				if (!next[row.id]) next[row.id] = { received_pln: row.admin_amount_received, cost_pln: row.admin_amount_costs }
			})
			return next
		})
	}, [list.data])

	const [activeHeaderKey, setActiveHeaderKey] = useState<Column['key'] | null>(null)

	const columns: Column[] = [
		{ key: 'id', label: 'Id', icon: Hash, width: '7%', align: 'left' },
		{ key: 'country', label: 'Kraj', icon: Globe, width: '10%', align: 'left', sortable: true },

		{ key: 'order_fullname', label: 'Klient', icon: User, align: 'left', sortable: true },

		{ key: 'status', label: 'Status', icon: BadgeCheck, width: '25%', align: 'center', sortable: true },
		{ key: 'received_pln', label: 'Wartość', icon: Banknote, width: '7%', align: 'center', sortable: true },
		{ key: 'cost_pln', label: 'Koszty', icon: Banknote, width: '7%', align: 'center', sortable: true },
		{ key: 'profit_pln', label: 'Zysk', icon: Banknote, width: '7%', align: 'center', sortable: true },
		{ key: 'created_at', label: 'Utworzone', icon: Calendar, width: '14%', align: 'center', sortable: true },
		{ key: 'actions', label: '', fixedPx: 140, align: 'right' },
	]

	const thAlign = (a: Column['align']) => (a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center')
	const tdAlign = thAlign

	const SortIndicator = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) =>
		active ? (
			dir === 'asc' ? (
				<ChevronUp className='h-3.5 w-3.5 opacity-70' />
			) : (
				<ChevronDown className='h-3.5 w-3.5 opacity-70' />
			)
		) : null

	const sortKeyFor = (key: Column['key']): SortKey | null => {
		switch (key) {
			case 'order_fullname':
				return 'order_fullname'
			case 'status':
				return 'status'
			case 'country':
				return 'country'
			case 'received_pln':
				return 'admin_amount_received'
			case 'cost_pln':
				return 'admin_amount_costs'
			case 'profit_pln':
				return 'admin_amount_received' // Sortowanie zysku po otrzymanej kwocie
			case 'created_at':
				return 'created_at'
			default:
				return null
		}
	}

	const isNumericCol = (k: Column['key']) => k === 'received_pln' || k === 'cost_pln' || k === 'profit_pln'
	const isDateCol = (k: Column['key']) => k === 'created_at'

	const onHeaderClick = (col: Column) => {
		const sk = sortKeyFor(col.key)
		if (!col.sortable || !sk) return
		setActiveHeaderKey(col.key)
		const isActiveList = list.sortKey === sk

		if (isNumericCol(col.key) || isDateCol(col.key)) {
			if (!isActiveList || activeHeaderKey !== col.key) list.setSortExact(sk, 'desc')
			else if (list.sortDir === 'desc') list.setSortExact(sk, 'asc')
			else {
				list.resetSort()
				setActiveHeaderKey(null)
			}
			return
		}
		if (!isActiveList || activeHeaderKey !== col.key) list.setSortExact(sk, 'asc')
		else if (list.sortDir === 'asc') list.setSortExact(sk, 'desc')
		else {
			list.resetSort()
			setActiveHeaderKey(null)
		}
	}

	const handleRowClick = (row: B2COrder) => setOrderIdForModal(row.id)

	const openOrderModalFromRow = (row: B2COrder) => setOrderIdForModal(row.id)

	return (
		<>
			<div className='overflow-x-auto rounded-lg border border-middle-blue bg-white overflow-hidden font-heebo_regular text-middle-blue'>
				<table className='min-w-full table-fixed text-[13px]'>
					<colgroup>
						{columns.map(col => (
							<col key={col.key} style={col.fixedPx ? { width: `${col.fixedPx}px` } : { width: col.width }} />
						))}
					</colgroup>

					<thead>
						<tr className='bg-dark-blue text-white'>
							{columns.map((col, i) => {
								const { key, label, icon: Icon, sortable } = col
								const sk = sortKeyFor(key)
								const listActive = sk && list.sortKey === sk
								const showArrow = Boolean(sortable && sk && listActive && activeHeaderKey === key)
								return (
									<th
										key={key}
										className={[
											'font-normal tracking-wide text-[12px] select-none',
											thAlign(col.align),
											col.sortable && sk ? 'cursor-pointer' : 'cursor-default',
											i === 0 ? 'first:rounded-tl-xs' : '',
											i === columns.length - 1 ? 'last:rounded-tr-xs' : '',
										].join(' ')}
										onClick={() => onHeaderClick(col)}>
										<div
											className={[
												'h-[56px] px-6',
												'flex items-center gap-2',
												col.align === 'center'
													? 'justify-center'
													: col.align === 'right'
													? 'justify-end'
													: 'justify-start',
												col.sortable ? 'hover:opacity-90 transition-opacity' : '',
											].join(' ')}>
											{Icon ? <Icon className='h-4 w-4 opacity-90' aria-hidden /> : null}
											<span className='opacity-95 truncate'>{label}</span>
											{showArrow ? <SortIndicator active dir={list.sortDir} /> : null}
										</div>
									</th>
								)
							})}
						</tr>
					</thead>

					<tbody className='divide-y divide-ds-border'>
						{list.data.map((row: B2COrder, idx: number) => {
							const cfg = getStatusConfig(row.status as OrderStatus)
							const StatusIcon = cfg.icon

							const countryInfo = getCountryInfoByName(row.country)
							const countryCode = countryInfo?.code ?? null
							const countryLabel = countryInfo?.label ?? row.country ?? 'Nieznany'

							// Wzięcie wartości z edycji, jeśli istnieje, w przeciwnym razie z row (bazy danych)
							const current = edits[row.id] ?? {
								received_pln: row.admin_amount_received,
								cost_pln: row.admin_amount_costs,
							}
							const profit = current.received_pln - current.cost_pln
							const zebra = idx % 2 === 0 ? 'bg-ds-light-blue' : 'bg-white'
							const itemsPreview =
								(row.items ?? [])
									.slice(0, 3)
									.map(i => `${i.name} ×${i.qty}`)
									.join(', ') + ((row.items?.length ?? 0) > 3 ? ', …' : '')
							const hasTracking = Boolean(row.tracking_link && row.tracking_link.trim())

							return (
								<tr
									key={row.id}
									onClick={() => handleRowClick(row)}
									className={[
										zebra,
										'transition-colors duration-200 hover:bg-ds-hover text-middle-blue/80 cursor-pointer',
									].join(' ')}>
									<td className={tdAlign('left')}>
										<div className='px-6 py-4'>
											<span className='font-heebo_medium truncate text-middle-blue'>{row.id}</span>
										</div>
									</td>

									<td className={tdAlign('left')}>
										<div className='px-6 py-4'>
											<span className='inline-flex items-center justify-start gap-2'>
												{countryCode && <Flag iso={countryCode} title={countryLabel} />}
												<span className='truncate'>{countryLabel}</span>
											</span>
										</div>
									</td>

									<td
										className={[
											tdAlign('left'),
											'cursor-pointer hover:bg-middle-blue/5 focus-within:bg-middle-blue/5 transition-colors duration-150',
										].join(' ')}
										onClick={e => {
											e.stopPropagation()
											setProfileIdForModal(row.user_id)
										}}>
										<div className='px-6 py-4'>
											<button
												type='button'
												className='truncate font-medium text-middle-blue pointer-events-none'
												title='Pokaż profil klienta'>
												{row.order_fullname ?? '—'}
											</button>
											<div className='text-[12px] text-middle-blue/70 truncate'>{itemsPreview}</div>
										</div>
									</td>

									<td className={tdAlign('center')}>
										<div className='px-6 py-4'>
											<div className='flex justify-center'>
												<span
													className='inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] leading-5 border'
													style={{ backgroundColor: cfg.bgColor, color: cfg.textColor, borderColor: cfg.textColor }}
													title={cfg.text}>
													<StatusIcon className='h-3.5 w-3.5' aria-hidden />
													<span className='truncate'>{cfg.text}</span>
												</span>
											</div>
										</div>
									</td>

									<td className={tdAlign('center')}>
										<div className='px-6 py-4' onClick={e => e.stopPropagation()}>
											<UniversalTableInput
												value={current.received_pln}
												suffix='zł'
												align='center'
												step={0.01}
												widthPx={110}
												displayClassName='text-[13px] opacity-80 whitespace-nowrap truncate text-center hover:bg-middle-blue/5 focus-within:bg-middle-blue/5 transition-colors duration-150 rounded-md py-1.5'
												onCommit={(next: number) => {
													setEdits(prev => {
														const prevRow = prev[row.id] ?? current
														return { ...prev, [row.id]: { ...prevRow, received_pln: next } }
													})
													if (typeof list.updateOrderAmounts === 'function') {
														void list.updateOrderAmounts(row.id, { received_pln: next, cost_pln: current.cost_pln })
													}
												}}
											/>
										</div>
									</td>

									<td className={tdAlign('center')}>
										<div className='px-6 py-4' onClick={e => e.stopPropagation()}>
											<UniversalTableInput
												value={current.cost_pln}
												suffix='zł'
												align='center'
												step={0.01}
												widthPx={110}
												displayClassName='text-[13px] opacity-80 whitespace-nowrap truncate text-center hover:bg-middle-blue/5 focus-within:bg-middle-blue/5 transition-colors duration-150 rounded-md py-1.5'
												onCommit={(next: number) => {
													setEdits(prev => {
														const prevRow = prev[row.id] ?? current
														return { ...prev, [row.id]: { ...prevRow, cost_pln: next } }
													})
													if (typeof list.updateOrderAmounts === 'function') {
														void list.updateOrderAmounts(row.id, { received_pln: current.received_pln, cost_pln: next })
													}
												}}
											/>
										</div>
									</td>

									<td className={tdAlign('center')}>
										<div className='px-6 py-4' onClick={e => e.stopPropagation()}>
											<span className='text-[13px] opacity-80 tabular-nums'>{PLN(profit)}</span>
										</div>
									</td>

									<td className={tdAlign('center')}>
										<div className='px-6 py-4' onClick={e => e.stopPropagation()}>
											<span className='text-[12px] text-middle-blue/60 tabular-nums'>{fmtDate(row.created_at)}</span>
										</div>
									</td>

									<td className={tdAlign('right')}>
										<div className='px-6 py-4'>
											<div className='flex items-center justify-end gap-2'>
												<button
													className='grid h-8 w-8 place-items-center rounded-lg border border-light-blue bg-white text-middle-blue transition-colors duration-200 hover:bg-light-blue/20'
													title='Podgląd'
													aria-label='Podgląd'
													onClick={e => {
														e.stopPropagation()
														openOrderModalFromRow(row)
													}}>
													<Eye className='h-4 w-4' />
												</button>

												<button
													className='grid h-8 w-8 place-items-center rounded-lg border border-light-blue bg-white text-middle-blue transition-colors duration-200 hover:bg-light-blue/20 disabled:opacity-40 disabled:cursor-not-allowed'
													title={hasTracking ? 'Otwórz śledzenie' : 'Brak linku śledzenia'}
													aria-label='Śledź'
													disabled={!hasTracking}
													onClick={e => {
														e.stopPropagation()
														if (!hasTracking || !row.tracking_link) return
														window.open(row.tracking_link, '_blank', 'noopener,noreferrer')
													}}>
													<Truck className='h-4 w-4' />
												</button>
											</div>
										</div>
									</td>
								</tr>
							)
						})}

						{list.data.length === 0 && (
							<tr>
								<td colSpan={columns.length} className='px-4 py-10 text-center text-middle-blue/70'>
									Brak wyników dla aktualnych filtrów.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className='mt-4 flex flex-wrap items-center justify-between gap-3 font-heebo_regular text-middle-blue'>
				<div className='flex items-center gap-3 text-[13px]'>
					<span>
						Łącznie: <span className='font-medium'>{list.total}</span> wyników
					</span>
					<button
						onClick={() => list.refresh()}
						disabled={list.refreshing}
						className='inline-flex items-center gap-1 rounded-md border border-light-blue px-2.5 py-1.5 hover:bg-white/50 disabled:opacity-50'
						title='Odśwież'
						aria-busy={list.refreshing}>
						<span className={list.refreshing ? 'animate-spin' : ''}>
							<RefreshCcw className='h-3.5 w-3.5' />
						</span>
						Odśwież
					</button>
				</div>

				<div className='relative flex items-center gap-2'>
					<div className='relative'>
						<button
							onClick={() => setShowPageSize(v => !v)}
							className='h-14 min-w-[120px] rounded-lg border border-light-blue bg-white/75 px-5 text-left text-middle-blue transition-colors hover:bg-light-blue/20 hover:ring-1 hover:ring-light-blue inline-flex items-center justify-between gap-2'
							aria-haspopup='listbox'
							aria-expanded={showPageSize}>
							<span className='text-[13px]'>{list.pageSize}/stronę</span>
							<ChevronDown className='h-4 w-4' />
						</button>
						{showPageSize && (
							<div className='absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-light-blue bg-white shadow-xl'>
								<div className='p-4'>
									<div className='flex flex-col divide-y divide-light-blue rounded-lg overflow-hidden'>
										{[10, 25, 50, 100].map(n => {
											const active = list.pageSize === n
											return (
												<button
													key={n}
													onClick={() => {
														list.setPageSize(n)
														list.setPage(1)
														setShowPageSize(false)
													}}
													className='w-full flex items-center justify-between px-4 py-3 text-[13px] outline-none transition-colors duration-200 hover:bg-light-blue/20 hover:ring-1 hover:ring-light-blue'
													role='option'
													aria-selected={active}>
													<span>{n}/stronę</span>
													{active && (
														<span className='inline-flex h-[18px] w-[18px] items-center justify-center rounded-lg bg-middle-blue text-white'>
															<Check className='h-3 w-3' />
														</span>
													)}
												</button>
											)
										})}
									</div>
								</div>
							</div>
						)}
					</div>

					<button
						onClick={() => list.setPage(Math.max(1, list.page - 1))}
						className='grid h-14 w-14 place-items-center rounded-lg border border-light-blue bg-white text-middle-blue transition-colors hover:bg-light-blue/20 disabled:opacity-40'
						disabled={list.page <= 1}
						title='Poprzednia strona'
						aria-label='Poprzednia strona'>
						<ChevronLeft className='h-5 w-5' />
					</button>

					<span className='px-2 text-[13px] text-middle-blue whitespace-nowrap'>
						Strona {list.page} / {list.totalPages}
					</span>

					<button
						onClick={() => list.setPage(Math.min(list.totalPages, list.page + 1))}
						className='grid h-14 w-14 place-items-center rounded-lg border border-light-blue bg-white text-middle-blue transition-colors hover:bg-light-blue/20 disabled:opacity-40'
						disabled={list.page >= list.totalPages}
						title='Następna strona'
						aria-label='Następna strona'>
						<ChevronRight className='h-5 w-5' />
					</button>
				</div>
			</div>

			<AdminProfileModal
				isOpen={!!profileIdForModal}
				onClose={() => setProfileIdForModal(null)}
				profileId={profileIdForModal || ''}
			/>
			<AdminOrderModal
				isOpen={!!orderIdForModal}
				onClose={() => setOrderIdForModal(null)}
				orderId={orderIdForModal || ''}
			/>
		</>
	)
}
