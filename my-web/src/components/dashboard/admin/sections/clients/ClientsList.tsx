// app/.../sections/clients/ClientsList.tsx
'use client'

import React, { useState } from 'react'
import {
	User,
	Mail,
	Phone,
	Building2,
	Calendar,
	ClipboardList,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	Check,
	RefreshCcw,
	type LucideIcon,
	Globe,
} from 'lucide-react'
import Flag from '@/components/common/Flag'
import AdminProfileModal from '../../common/AdminProfileModal/AdminProfileModal'
import type { ClientsListCtrl, SortKey } from './useClientsList'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

// ZMIANA: Klucze kolumn snake_case (ClientRow)
type ColumnKey = 'name' | 'country' | 'email' | 'phone' | 'type' | 'orders_count' | 'created_at'
type Column = {
	key: ColumnKey
	label: string
	icon?: LucideIcon
	width?: string
	fixedPx?: number
	align?: 'left' | 'center' | 'right'
	sortable?: boolean
}

export default function ClientsList({ list }: { list: ClientsListCtrl }) {
	const [profileIdForModal, setProfileIdForModal] = useState<string | null>(null)
	const [showPageSize, setShowPageSize] = useState(false)
	const [activeHeaderKey, setActiveHeaderKey] = useState<ColumnKey | null>(null)

	const columns: Column[] = [
		{ key: 'name', label: 'Klient', icon: User, width: '22%', align: 'left', sortable: true },
		// ZMIANA: Wyrównanie Kraju na 'left'
		{ key: 'country', label: 'Kraj', icon: Globe, width: '16%', align: 'left', sortable: true },
		{ key: 'email', label: 'E-mail', icon: Mail, width: '22%', align: 'left', sortable: true },
		{ key: 'phone', label: 'Telefon', icon: Phone, width: '16%', align: 'left' },
		{ key: 'type', label: 'Typ', icon: Building2, width: '10%', align: 'center', sortable: true },
		{ key: 'orders_count', label: 'Zamówienia', icon: ClipboardList, width: '7%', align: 'center', sortable: true },
		{ key: 'created_at', label: 'Utworzony', icon: Calendar, width: '7%', align: 'center', sortable: true },
	]

	const SortIndicator = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) =>
		active ? (
			dir === 'asc' ? (
				<ChevronUp className='h-3.5 w-3.5 opacity-90' />
			) : (
				<ChevronDown className='h-3.5 w-3.5 opacity-90' />
			)
		) : null

	const sortKeyFor = (key: ColumnKey): SortKey | null => {
		switch (key) {
			case 'name':
				return 'name'
			case 'email':
				return 'email'
			case 'country':
				return 'country'
			case 'type':
				return 'type'
			case 'orders_count':
				return 'orders_count' as SortKey
			case 'created_at':
				return 'created_at' as SortKey
			default:
				return null
		}
	}

	const isNumericCol = (k: ColumnKey) => k === 'orders_count'
	const isDateCol = (k: ColumnKey) => k === 'created_at'

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
		} else {
			if (!isActiveList || activeHeaderKey !== col.key) list.setSortExact(sk, 'asc')
			else if (list.sortDir === 'asc') list.setSortExact(sk, 'desc')
			else {
				list.resetSort()
				setActiveHeaderKey(null)
			}
		}
	}

	// refresh
	const [localSpin, setLocalSpin] = useState(false)
	const spinning = list.refreshing || localSpin
	const handleRefresh = async () => {
		setLocalSpin(true)
		const start = Date.now()
		try {
			await list.refresh()
		} finally {
			const elapsed = Date.now() - start
			const min = 600
			const left = Math.max(0, min - elapsed)
			window.setTimeout(() => setLocalSpin(false), left)
		}
	}

	const thAlign = (a: Column['align']) => (a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center')
	const tdAlign = thAlign

	// Funkcja otwierająca modal po kliknięciu w wiersz
	const handleRowClick = (userId: string) => {
		setProfileIdForModal(userId)
	}

	return (
		<div className='font-heebo_regular text-middle-blue'>
			<div className='overflow-x-auto rounded-lg border border-middle-blue bg-white select-none caret-transparent'>
				<table className='min-w-full table-fixed text-[13px]'>
					<colgroup>
						{columns.map(c => (
							<col key={c.key} style={c.fixedPx ? { width: `${c.fixedPx}px` } : { width: c.width }} />
						))}
					</colgroup>

					{/* HEADER — jak w „Recent Orders” */}
					<thead>
						<tr className='bg-dark-blue text-white'>
							{columns.map((c, i) => {
								const sk = sortKeyFor(c.key)
								const listActive = Boolean(c.sortable && sk && list.sortKey === sk)
								const showArrow = Boolean(c.sortable && sk && listActive && activeHeaderKey === c.key)
								return (
									<th
										key={c.key}
										className={[
											'font-normal tracking-wide text-[12px] select-none',
											thAlign(c.align),
											c.sortable && sk ? 'cursor-pointer' : 'cursor-default',
											i === 0 ? 'first:rounded-tl-xs' : '',
											i === columns.length - 1 ? 'last:rounded-tr-xs' : '',
										].join(' ')}
										onClick={() => onHeaderClick(c)}>
										<div
											className={[
												'h-[56px] px-6',
												'flex items-center gap-2',
												c.align === 'center' ? 'justify-center' : c.align === 'right' ? 'justify-end' : 'justify-start',
												c.sortable ? 'hover:opacity-90 transition-opacity' : '',
											].join(' ')}>
											{c.icon ? <c.icon className='h-4 w-4 opacity-90' aria-hidden /> : null}
											<span className='opacity-90 truncate'>{c.label}</span>
											{showArrow ? <SortIndicator active dir={list.sortDir} /> : null}
										</div>
									</th>
								)
							})}
						</tr>
					</thead>

					{/* BODY */}
					<tbody className='divide-y divide-ds-border'>
						{list.data.map((row, idx) => {
							const zebra = idx % 2 === 0 ? 'bg-ds-light-blue' : 'bg-white'

							const countryInfo = getCountryInfoByName(row.country)
							const iso2 = countryInfo?.code ?? null
							const countryLabel = countryInfo?.label ?? row.country ?? '—'

							const phone = row.phone || '—'
							const createdOnlyDate = new Date(row.created_at).toLocaleDateString('pl-PL')
							const clientLabel = row.name && row.name.trim() ? row.name : row.email

							return (
								<tr
									key={row.id}
									onClick={() => handleRowClick(row.id)} // KLIKALNY CAŁY WIERSZ
									className={[
										zebra,
										'transition-colors duration-200 hover:bg-ds-hover text-middle-blue/80 cursor-pointer', // Kursor na cały wiersz
									].join(' ')}>
									{/* Client */}
									<td className={tdAlign('left')}>
										<div className='px-6 py-4'>
											{/* Usunięto onClick z buttona, aby działał onClick na TR */}
											<button
												type='button'
												className='truncate font-medium text-[14px] text-middle-blue hover:opacity-90'
												title='Otwórz profil'>
												{clientLabel}
											</button>
										</div>
									</td>

									{/* Country - ZMIANA WYRÓWNANIA */}
									<td className={tdAlign('left')}>
										<div className='px-6 py-4'>
											<div className='flex items-center justify-start gap-2'>
												{' '}
												{/* ZMIANA justify-center na justify-start */}
												<Flag iso={iso2 || null} title={countryLabel} />
												<span className='truncate'>{countryLabel}</span>
											</div>
										</div>
									</td>

									{/* Email */}
									<td className={tdAlign('left')}>
										<div className='px-6 py-4'>
											<span className='truncate text-[13px] text-middle-blue/90'>{row.email || '—'}</span>
										</div>
									</td>

									{/* Phone */}
									<td className={tdAlign('left')}>
										<div className='px-6 py-4'>
											<span className='truncate text-[13px] text-middle-blue/90'>{phone}</span>
										</div>
									</td>

									{/* Type */}
									<td className={tdAlign('center')}>
										<div className='px-6 py-4'>
											<span className='text-[13px] text-middle-blue/80 uppercase tracking-wide'>{row.type}</span>
										</div>
									</td>

									{/* Orders */}
									<td className={tdAlign('center')}>
										<div className='px-6 py-4'>
											<span className='text-[13px] text-middle-blue/80 tabular-nums'>{row.orders_count}</span>
										</div>
									</td>

									{/* Created */}
									<td className={tdAlign('center')}>
										<div className='px-6 py-4'>
											<span className='text-[12px] text-middle-blue/60 tabular-nums'>{createdOnlyDate}</span>
										</div>
									</td>
								</tr>
							)
						})}

						{list.data.length === 0 && (
							<tr>
								<td colSpan={columns.length} className='px-6 py-10 text-center text-middle-blue/70'>
									Brak wyników dla aktualnych filtrów.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* PAGINACJA + ODŚWIEŻ — spójny styl */}
			<div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
				<div className='flex items-center gap-3 text-[13px] text-middle-blue'>
					<span>
						Łącznie: <span className='font-medium'>{list.total}</span> wyników
					</span>
					<button
						onClick={handleRefresh}
						disabled={spinning}
						className='inline-flex items-center gap-1 rounded-lg border border-ds-border bg-ds-light-blue px-3 py-2 hover:bg-ds-hover hover:border-middle-blue transition-colors disabled:opacity-50'
						title='Odśwież'
						aria-busy={spinning}>
						<span className={spinning ? 'animate-spin' : ''}>
							<RefreshCcw className='w-3.5 h-3.5' aria-hidden />
						</span>
						Odśwież
					</button>
				</div>

				<div className='relative flex items-center gap-2'>
					<div className='relative'>
						<button
							onClick={() => setShowPageSize(v => !v)}
							className='h-12 min-w-[120px] rounded-lg border border-ds-border bg-ds-light-blue px-5 text-left text-middle-blue transition-colors hover:bg-ds-hover hover:border-middle-blue inline-flex items-center justify-between gap-2'
							aria-haspopup='listbox'
							aria-expanded={showPageSize}>
							<span className='text-[13px]'>{list.pageSize}/stronę</span>
							<ChevronDown className='h-4 w-4' />
						</button>
						{showPageSize && (
							<div className='absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-light-blue bg-white shadow-xl'>
								<div className='p-2'>
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
													className='w-full flex items-center justify-between px-4 py-3 text-[13px] outline-none transition-colors hover:bg-light-blue/20'
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
						className='grid h-12 w-12 place-items-center rounded-lg border border-ds-border bg-ds-light-blue text-middle-blue transition-colors hover:bg-ds-hover hover:border-middle-blue disabled:opacity-40'
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
						className='grid h-12 w-12 place-items-center rounded-lg border border-ds-border bg-ds-light-blue text-middle-blue transition-colors hover:bg-ds-hover hover:border-middle-blue disabled:opacity-40'
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
		</div>
	)
}
