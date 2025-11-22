// app/.../sections/clients/ClientsSearch.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Search, Users, Globe, ChevronDown, X } from 'lucide-react'
import Flag from '@/components/common/Flag'
import UniversalDropdownModal from '@/components/ui/UniversalDropdownModal'
import type { ClientsListCtrl } from './useClientsList'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

type Props = { list: ClientsListCtrl }

const TYPES = [
	{ key: 'all', label: 'Wszyscy' },
	{ key: 'B2C', label: 'B2C' },
	{ key: 'B2B', label: 'B2B' },
] as const

const MAX_ROWS = 8

export default function ClientsSearch({ list }: Props) {
	// Ustawiamy stan początkowy na podstawie filtru
	const [qInput, setQInput] = useState<string>(list.filters.q ?? '')

	// WAŻNE: Synchronizujemy input tylko raz przy pierwszym renderze lub
	// gdy filtr jest zmieniony z zewnątrz (np. reset button)
	useEffect(() => {
		if ((list.filters.q ?? '') !== qInput) {
			setQInput(list.filters.q ?? '')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [list.filters.q])

	// debounce: Logika wpisywania i wyszukiwania jest w debounce (OK)
	useEffect(() => {
		const t = setTimeout(() => {
			if ((list.filters.q ?? '') !== qInput) {
				list.setFilters({ q: qInput })
				list.setPage(1)
			}
		}, 300)
		return () => clearTimeout(t)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [qInput])

	// USUNIĘTO DRUGI ZBĘDNY useEffect!

	// Pobieramy NAZWY krajów z 'country'
	const countries = useMemo(() => {
		const set = new Set<string>()
		list.data.forEach(c => c.country && set.add(c.country))
		return Array.from(set).sort()
	}, [list.data])

	const anyFilter = !!qInput.trim() || !!list.filters.country || list.filters.type !== 'all' || !!list.filters.returning

	const CHIP =
		'h-14 rounded-lg border border-light-blue bg-white px-4 text-sm ' +
		'flex items-center gap-2 transition-colors ' +
		'hover:bg-light-blue/10 hover:ring-1 hover:ring-light-blue/60'

	const activeCountryInfo = useMemo(() => getCountryInfoByName(list.filters.country), [list.filters.country])

	// ZMIANA: Tworzenie opcji kraju
	const countryOptions = useMemo(
		() => [
			{
				value: '',
				content: (
					<span className='inline-flex items-center gap-2 text-middle-blue/80'>
						<Globe className='h-4 w-4 opacity-80' />
						<span>Wszystkie kraje</span>
					</span>
				),
			},
			...countries.map(countryName => {
				const info = getCountryInfoByName(countryName)
				return {
					value: countryName, // Wartością jest nazwa
					content: (
						<span className='inline-flex items-center gap-2'>
							<Flag iso={info?.code ?? null} title={info?.label ?? countryName} />
							<span>{info?.label ?? countryName}</span>
						</span>
					),
				}
			}),
		],
		[countries]
	)

	// LOGIKA SCROLLA: Używamy menuClassName, aby dodać scrolla, gdy jest więcej niż MAX_ROWS
	const countryMenuClasses = useMemo(() => {
		if (countryOptions.length > MAX_ROWS) {
			return `max-h-[${MAX_ROWS * 40}px] overflow-y-auto custom-scroll`
		}
		return ''
	}, [countryOptions.length])

	return (
		<div className='space-y-3 font-heebo_regular text-middle-blue'>
			<div className='flex flex-col gap-2 md:flex-row md:items-center'>
				{/* Fraza */}
				<div className='relative flex-1'>
					<Search className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-60' />
					<input
						value={qInput}
						onChange={e => setQInput(e.target.value)}
						// Klasy są teraz zminimalizowane
						className='h-14 w-full rounded-lg border border-light-blue bg-white pl-12 pr-4 text-sm outline-none placeholder:text-middle-blue/50 focus:ring-0'
						placeholder='Imię, nazwisko, e-mail, kraj...'
					/>
				</div>

				{/* Kraj */}
				<UniversalDropdownModal
					bareButton
					button={
						<div className={`${CHIP} w-[280px]`}>
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
						list.setFilters({ country: val }) // Filtrujemy po NAZWIE
						list.setPage(1)
					}}
					menuClassName={countryMenuClasses} // Wstrzyknięcie klas scrolla do kontenera menu
					options={countryOptions}
				/>

				{/* Typ */}
				<UniversalDropdownModal
					bareButton
					button={
						<div className={`${CHIP} w-[180px]`}>
							<span className={list.filters.type === 'all' ? 'text-middle-blue/60' : 'text-middle-blue'}>
								{TYPES.find(t => t.key === list.filters.type)?.label ?? 'Rodzaj'}
							</span>
							<ChevronDown className='ml-auto h-4 w-4 opacity-80' />
						</div>
					}
					selected={list.filters.type}
					onSelect={(val: string) => {
						list.setFilters({ type: val as (typeof TYPES)[number]['key'] })
						list.setPage(1)
					}}
					options={TYPES.map(t => ({
						value: t.key,
						content: <span className='text-middle-blue'>{t.label}</span>,
					}))}
				/>

				{/* Powracający */}
				<button
					type='button'
					onClick={() => {
						list.setFilters({ returning: !list.filters.returning })
						list.setPage(1)
					}}
					className={CHIP + ' w-[200px]'}
					aria-pressed={!!list.filters.returning}>
					<Users className={'h-5 w-5 ' + (list.filters.returning ? 'text-middle-blue' : 'text-middle-blue/60')} />
					<span className={list.filters.returning ? 'text-middle-blue' : 'text-middle-blue/60'}>
						{list.filters.returning ? 'Powracający ✓' : 'Powracający'}
					</span>
				</button>
			</div>

			{/* Chipy aktywnych filtrów */}
			{anyFilter && (
				<div className='flex flex-wrap items-center gap-2'>
					{!!qInput.trim() && (
						<Chip
							label={`Szukaj: “${qInput.trim()}”`}
							onClear={() => {
								setQInput('')
								list.setFilters({ q: '' })
								list.setPage(1)
							}}
						/>
					)}
					{!!list.filters.country && (
						<Chip
							label={`Kraj: ${activeCountryInfo?.label ?? list.filters.country}`}
							onClear={() => {
								list.setFilters({ country: '' })
								list.setPage(1)
							}}
						/>
					)}
					{list.filters.type !== 'all' && (
						<Chip
							label={`Rodzaj: ${list.filters.type}`}
							onClear={() => {
								list.setFilters({ type: 'all' })
								list.setPage(1)
							}}
						/>
					)}
					{!!list.filters.returning && (
						<Chip
							label='Powracający: tak'
							onClear={() => {
								list.setFilters({ returning: false })
							}}
						/>
					)}
				</div>
			)}
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
