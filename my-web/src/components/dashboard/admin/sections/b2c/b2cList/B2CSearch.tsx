// app/.../b2cList/b2cList/B2CSearch.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, X, Search, Globe, ChevronDown } from 'lucide-react'
import Flag from '@/components/common/Flag'
// ZMIANA: Poprawny import helpera
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'
import UniversalDropdownModal from '@/components/ui/UniversalDropdownModal'
import type { ListCtrl } from './useB2CList'
import type { B2COrder } from './B2CTypes' // Importujemy B2COrder dla snake_case
import { getCountryInfoByName } from '@/utils/country/countryHelper'

type Props = { list: ListCtrl }

const STATUS_KEYS: OrderStatus[] = [
	'created',
	'submitted',
	'quote_ready',
	'preparing_order',
	'shipped',
	'delivered',
	'cancelled',
]

// Jeden spójny styl dla „chipów” (Kraj / Data)
const CHIP =
	'h-14 rounded-lg border border-light-blue bg-white px-4 text-sm flex items-center gap-2 ' +
	'transition-colors hover:bg-light-blue/10 hover:ring-1 hover:ring-light-blue/60'

// Minimalne helpery do obrysu jak wcześniej
const colorWithAlpha = (hex: string, alpha: number) => {
	const h = hex.replace('#', '')
	const r = parseInt(h.substring(0, 2), 16)
	const g = parseInt(h.substring(2, 4), 16)
	const b = parseInt(h.substring(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
const outlineShadow = (px: number, color: string) => `inset 0 0 0 ${px}px ${color}`

// ZMIANA: Używamy snake_case
const fmtRange = (from?: string, to?: string) => (from || to ? `${from ?? '—'} → ${to ?? '—'}` : 'Data')

export default function B2CSearch({ list }: Props) {
	const [showDate, setShowDate] = useState(false)
	const popoverRef = useRef<HTMLDivElement | null>(null)

	// Debounce query
	const [qInput, setQInput] = useState<string>(list.filters.query ?? '')
	useEffect(() => {
		const t = setTimeout(() => {
			if (qInput !== (list.filters.query ?? '')) {
				list.setFilters(f => ({ ...f, query: qInput }))
				list.setPage?.(1)
			}
		}, 300)
		return () => clearTimeout(t)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [qInput, list.filters.query])
	useEffect(() => {
		if ((list.filters.query ?? '') !== qInput) setQInput(list.filters.query ?? '')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [list.filters.query])

	// Zamykaj popover daty klik/ESC
	useEffect(() => {
		const clickOutside = (e: MouseEvent) => {
			if (!popoverRef.current) return
			if (!popoverRef.current.contains(e.target as Node)) setShowDate(false)
		}
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setShowDate(false)
		}
		document.addEventListener('mousedown', clickOutside)
		document.addEventListener('keydown', onEsc)
		return () => {
			document.removeEventListener('mousedown', clickOutside)
			document.removeEventListener('keydown', onEsc)
		}
	}, [])

	// ZMIANA: Używamy snake_case
	const dateActive = !!list.filters.date_from || !!list.filters.date_to

	const toggleStatus = (id: OrderStatus) => {
		list.setFilters(f => {
			const has = f.statuses.includes(id)
			const next = has ? f.statuses.filter(s => s !== id) : [...f.statuses, id]
			return { ...f, statuses: next }
		})
		list.setPage?.(1)
	}

	// ZMIANA: Kraje pobierane z 'country' (nazwa), a nie 'countryCode'
	const countries = useMemo(() => {
		const set = new Set<string>()
		// Używamy B2COrder, który ma snake_case
		;(list.data ?? []).forEach((o: B2COrder) => o.country && set.add(o.country))
		return Array.from(set).sort()
	}, [list.data])

	const hasAnyFilter =
		list.filters.statuses.length > 0 ||
		!!list.filters.date_from || // ZMIANA
		!!list.filters.date_to || // ZMIANA
		!!list.filters.query ||
		!!list.filters.country

	// ZMIANA: Pobieramy info o kraju dla aktywnego filtra
	const activeCountryInfo = useMemo(() => getCountryInfoByName(list.filters.country), [list.filters.country])

	return (
		<div className='space-y-3 font-heebo_regular text-middle-blue'>
			{/* Pasek: input + kraj + data */}
			<div className='flex flex-col gap-2 md:flex-row md:items-center'>
				{/* Input */}
				<div className='relative flex-1'>
					<Search className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-60' />
					<input
						value={qInput}
						onChange={e => setQInput(e.target.value)}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								const q = qInput.trim()
								list.setFilters(f => ({ ...f, query: q }))
								list.setPage?.(1)
							}
							if (e.key === 'Escape') {
								setQInput('')
								list.setFilters(f => ({ ...f, query: '' }))
								list.setPage?.(1)
							}
						}}
						className='h-14 w-full rounded-lg border border-light-blue bg-white pl-12 pr-4 text-sm outline-none focus:outline-none focus:ring-0 placeholder-middle-blue/60'
						placeholder='Szukaj: PEF, klient, e-mail, telefon, kraj, nazwy przedmiotów…' // Usunięto "kod"
					/>
				</div>

				{/* Kraj */}
				<UniversalDropdownModal
					bareButton
					button={
						<div className={`${CHIP} w-[280px]`}>
							{/* ZMIANA: Logika flagi na podstawie activeCountryInfo */}
							{activeCountryInfo ? (
								<Flag iso={activeCountryInfo.code ?? null} title={activeCountryInfo.label} />
							) : (
								<Globe className='h-4 w-4 opacity-80' />
							)}
							<span className={list.filters.country ? 'text-middle-blue' : 'text-middle-blue/60'}>
								{activeCountryInfo?.label ?? 'Wszystkie kraje'}
							</span>
							<ChevronDown className='ml-auto h-4 w-4 opacity-80' />
						</div>
					}
					selected={list.filters.country || ''}
					onSelect={(val: string) => {
						list.setFilters(f => ({ ...f, country: val || undefined }))
						list.setPage?.(1)
					}}
					options={[
						{
							value: '',
							content: (
								<span className='inline-flex items-center gap-2 text-middle-blue/80'>
									<Globe className='h-4 w-4 opacity-80' />
									<span>Wszystkie kraje</span>
								</span>
							),
						},
						// ZMIANA: Mapujemy po nazwach, a nie kodach
						...countries.map(countryName => {
							const countryInfo = getCountryInfoByName(countryName)
							return {
								value: countryName,
								content: (
									<span className='inline-flex items-center gap-2'>
										<Flag iso={countryInfo?.code ?? null} title={countryInfo?.label ?? countryName} />
										<span>{countryInfo?.label ?? countryName}</span>
									</span>
								),
							}
						}),
					]}
				/>

				{/* Data (spójny wygląd jak „Kraj”) */}
				<div className='relative' ref={popoverRef}>
					<button
						type='button'
						onClick={() => setShowDate(s => !s)}
						className={`${CHIP} w-[280px]`}
						aria-label='Filtr daty'
						title='Data'>
						<Calendar className='h-4 w-4 opacity-80' />
						<span className={dateActive ? 'text-middle-blue' : 'text-middle-blue/60'}>
							{/* ZMIANA: Używamy snake_case */}
							{fmtRange(list.filters.date_from, list.filters.date_to)}
						</span>
						<ChevronDown className='ml-auto h-4 w-4 opacity-80' />
					</button>

					{showDate && (
						<div className='absolute right-0 top-full mt-2 z-20 w-96 rounded-2xl border border-light-blue bg-white shadow-xl'>
							<div className='p-6 space-y-4'>
								<div className='grid grid-cols-[36px,1fr] items-center gap-3 rounded-lg bg-light-blue/30 px-3 py-3 border border-light-blue'>
									<span className='text-xs text-middle-blue font-medium'>Od</span>
									<input
										type='date'
										value={list.filters.date_from ?? ''} // ZMIANA
										onChange={e => {
											list.setFilters(f => ({ ...f, date_from: e.target.value || undefined })) // ZMIANA
											list.setPage?.(1)
										}}
										className='w-full rounded-lg border border-light-blue bg-white px-3 py-2 text-sm outline-none focus:outline-none focus:ring-2 focus:ring-middle-blue/30'
									/>
								</div>
								<div className='grid grid-cols-[36px,1fr] items-center gap-3 rounded-lg bg-light-blue/30 px-3 py-3 border border-light-blue'>
									<span className='text-xs text-middle-blue font-medium'>Do</span>
									<input
										type='date'
										value={list.filters.date_to ?? ''} // ZMIANA
										onChange={e => {
											list.setFilters(f => ({ ...f, date_to: e.target.value || undefined })) // ZMIANA
											list.setPage?.(1)
										}}
										className='w-full rounded-lg border border-light-blue bg-white px-3 py-2 text-sm outline-none focus:outline-none focus:ring-2 focus:ring-middle-blue/30'
									/>
								</div>

								<div className='flex items-center justify-end pt-5 border-t border-light-blue'>
									<button
										type='button'
										onClick={() => setShowDate(false)}
										className='text-xs inline-flex items-center gap-1 rounded-md px-3 py-1.5 bg-middle-blue text-white'>
										OK
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Statusy + chipy */}
			<div className='flex flex-wrap items-center gap-2'>
				{/* Statusy z „fajnymi borderami” (inset box-shadow) */}
				<div className='flex flex-wrap gap-2'>
					{STATUS_KEYS.map(s => {
						const cfg = getStatusConfig(s)
						const Icon = cfg.icon
						const active = list.filters.statuses.includes(s)
						const subtle = colorWithAlpha((cfg.textColor as string) || '#22577A', 0.5)
						const strong = (cfg.textColor as string) || '#22577A'

						return (
							<button
								key={s}
								type='button'
								onClick={() => toggleStatus(s)}
								className={[
									'group inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] leading-5',
									'transition-[box-shadow,filter,opacity,background-color,color] duration-200 ease-out',
									'focus:outline-none',
									active ? 'opacity-100' : 'opacity-80 hover:opacity-100',
								].join(' ')}
								style={{
									backgroundColor: cfg.bgColor,
									color: cfg.textColor,
									boxShadow: active ? outlineShadow(2, strong) : outlineShadow(1, subtle),
									filter: active ? 'none' : 'grayscale(40%) brightness(0.95)',
								}}
								onMouseEnter={e => {
									if (!active) e.currentTarget.style.filter = 'none'
								}}
								onMouseLeave={e => {
									if (!active) e.currentTarget.style.filter = 'grayscale(40%) brightness(0.95)'
								}}
								title={cfg.text}
								aria-pressed={active}>
								<Icon className='h-3.5 w-3.5' aria-hidden='true' />
								<span className='truncate'>{cfg.text}</span>
							</button>
						)
					})}
				</div>

				{/* Chipy aktywnych filtrów */}
				{hasAnyFilter && (
					<div className='ml-auto flex flex-wrap items-center gap-2'>
						{list.filters.statuses.length > 0 && (
							<Chip
								label={`Statusy: ${list.filters.statuses.map(s => getStatusConfig(s).text).join(', ')}`}
								onClear={() => {
									list.setFilters(f => ({ ...f, statuses: [] }))
									list.setPage?.(1)
								}}
							/>
						)}
						{/* ZMIANA: snake_case */}
						{(list.filters.date_from || list.filters.date_to) && (
							<Chip
								label={`Data: ${fmtRange(list.filters.date_from, list.filters.date_to)}`} // ZMIANA
								onClear={() => {
									list.setFilters(f => ({ ...f, date_from: undefined, date_to: undefined })) // ZMIANA
									list.setPage?.(1)
								}}
							/>
						)}
						{!!list.filters.country && (
							<Chip
								// ZMIANA: Używamy helpera do wyświetlenia etykiety
								label={`Kraj: ${activeCountryInfo?.label ?? list.filters.country}`}
								onClear={() => {
									list.setFilters(f => ({ ...f, country: undefined }))
									list.setPage?.(1)
								}}
							/>
						)}
						{!!list.filters.query && (
							<Chip
								label={`Szukaj: “${list.filters.query}”`}
								onClear={() => {
									setQInput('')
									list.setFilters(f => ({ ...f, query: '' }))
									list.setPage?.(1)
								}}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
	return (
		<span className='inline-flex max-w-full items-center rounded-lg bg-middle-blue/10 text-middle-blue select-none'>
			<span className='px-3 py-2 text-xs truncate'>{label}</span>
			<button
				onClick={onClear}
				className='ml-1 mr-1 grid h-5 w-5 place-items-center rounded-md text-middle-blue/80 hover:text-middle-blue hover:bg-light-blue/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue/30'
				title='Usuń filtr'
				aria-label='Usuń filtr'>
				<X className='h-3.5 w-3.5' />
			</button>
		</span>
	)
}
