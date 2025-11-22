'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import Flag from '@/components/common/Flag'
// ZMIANA 1: Import dynamicznych aliasów (poprawna ścieżka)
import { COUNTRY_ALIASES } from '@/utils/country/countryAliases'

export interface SelectOption {
	value: string
	label: string
	code?: string
}

// ZMIANA 2: Zmiana nazwy interfejsu
interface CustomSelectProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	disabled?: boolean
	options: string[] | SelectOption[]
	error?: string
	showFlags?: boolean
	className?: string
	name?: string
	required?: boolean
}

// ZMIANA 3: Usunięcie starej, zahardkodowanej listy
// const DEFAULT_ALIASES: Record<string, string> = { ... }

// ZMIANA 4: Przeniesienie helperów na zewnątrz
const normalize = (s: string) =>
	(s || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')

const squash = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '')

// ZMIANA 5: Zmiana nazwy komponentu
export default function CustomSelect({
	value,
	onChange,
	placeholder = 'Select option...',
	disabled = false,
	options = [],
	error,
	showFlags = true,
	className = '',
	name,
	required,
}: CustomSelectProps) {
	// ZMIANA 6: Użycie nowej nazwy propsów
	const rootRef = useRef<HTMLDivElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const [isOpen, setIsOpen] = useState(false)
	const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
	const [query, setQuery] = useState('')

	// ZMIANA 7: Dynamiczne budowanie aliasów z zaimportowanej listy
	const DEFAULT_ALIASES = useMemo(() => {
		const aliasMap: Record<string, string> = {}
		for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
			aliases.forEach(alias => {
				aliasMap[squash(alias)] = code
			})
		}
		return aliasMap
	}, [])

	const normalized: SelectOption[] = useMemo(
		() =>
			options.map(o => {
				if (typeof o === 'string') return { value: o, label: o, code: o }
				return { ...o, code: o.code ?? o.value }
			}),
		[options]
	)

	const selected = useMemo(() => normalized.find(o => o.value === value), [normalized, value])

	const filtered = useMemo(() => {
		const q = query.trim()
		const qNorm = normalize(q)
		const qSquash = squash(q)
		if (!qNorm) return normalized

		const results = normalized.map(opt => {
			const label = normalize(opt.label)
			const val = normalize(opt.value)
			const code = normalize(opt.code || opt.value)

			let score = 0

			if (DEFAULT_ALIASES[qSquash]?.toLowerCase() === val) score += 1000

			if (val.startsWith(qNorm) || code.startsWith(qNorm) || val.startsWith(qSquash) || code.startsWith(qSquash))
				score += 300

			if (label.startsWith(qNorm)) score += 200

			if (`${label} ${val} ${code}`.includes(qNorm)) score += 100

			return { opt, score }
		})

		results.sort((a, b) => b.score - a.score || a.opt.label.localeCompare(b.opt.label))
		return results.filter(r => r.score > 0).map(r => r.opt)
	}, [normalized, query, DEFAULT_ALIASES]) // ZMIANA 8: Dodano 'DEFAULT_ALIASES' do zależności

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setIsOpen(false)
				setHighlightedIndex(-1)
				setQuery('')
			}
		}
		document.addEventListener('mousedown', onDocClick)
		return () => document.removeEventListener('mousedown', onDocClick)
	}, [])

	// ZMIANA 9: Poprawka błędu logicznego Reacta (stabilna funkcja scrolla)
	const scrollHighlightedIntoView = useCallback((indexToScroll: number) => {
		const list = listRef.current
		if (!list) return
		const item = list.querySelector<HTMLButtonElement>(`[data-index="${indexToScroll}"]`)
		if (item) {
			const it = item.offsetTop
			const ib = it + item.offsetHeight
			const vt = list.scrollTop
			const vb = vt + list.clientHeight
			if (it < vt) list.scrollTop = it
			else if (ib > vb) list.scrollTop = ib - list.clientHeight
		}
	}, [])

	useEffect(() => {
		if (!isOpen) return
		setTimeout(() => {
			inputRef.current?.focus()
			const idx = Math.max(
				0,
				filtered.findIndex(o => o.value === value)
			)
			setHighlightedIndex(idx >= 0 ? idx : 0)
			scrollHighlightedIntoView(idx >= 0 ? idx : 0)
		}, 0)
	}, [isOpen, value, filtered, scrollHighlightedIntoView])

	useEffect(() => {
		if (!isOpen) return
		setHighlightedIndex(0)
		setTimeout(() => scrollHighlightedIntoView(0), 0)
	}, [query, isOpen, scrollHighlightedIntoView])

	const choose = useCallback(
		(val: string) => {
			onChange(val)
			setIsOpen(false)
			setQuery('')
			setHighlightedIndex(-1)
			inputRef.current?.blur()
		},
		[onChange]
	)

	const moveHighlight = useCallback(
		(dir: 1 | -1) => {
			if (!filtered.length) return
			setHighlightedIndex(prev => {
				const next = prev < 0 ? 0 : (prev + dir + filtered.length) % filtered.length
				scrollHighlightedIntoView(next)
				return next
			})
		},
		[filtered.length, scrollHighlightedIntoView]
	)

	const inputValue = isOpen ? query : selected?.label ?? ''

	const leftPad = showFlags && selected?.code ? 'pl-14' : 'pl-4 md:pl-6'

	return (
		<div ref={rootRef} className={`w-full relative ${className}`}>
			{name && <input type='hidden' name={name} value={value || ''} />}
			{required && !value && <span className='sr-only'>This field is required</span>}

			<div className='relative'>
				{showFlags && selected?.code && (
					<span className='absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none'>
						<Flag iso={selected.code} title={selected.label} size={18} />
					</span>
				)}

				<input
					ref={inputRef}
					type='text'
					role='combobox'
					aria-expanded={isOpen}
					disabled={disabled}
					placeholder={placeholder}
					value={inputValue}
					onChange={e => {
						if (!isOpen) setIsOpen(true)
						setQuery(e.target.value)
					}}
					onFocus={() => setIsOpen(true)}
					onClick={() => setIsOpen(true)}
					onKeyDown={e => {
						if (disabled) return
						switch (e.key) {
							case 'ArrowDown':
								e.preventDefault()
								isOpen ? moveHighlight(1) : setIsOpen(true)
								break
							case 'ArrowUp':
								e.preventDefault()
								isOpen ? moveHighlight(-1) : setIsOpen(true)
								break
							case 'Enter':
								if (isOpen && highlightedIndex >= 0 && filtered[highlightedIndex]) {
									e.preventDefault()
									choose(filtered[highlightedIndex].value)
								}
								break
							case 'Escape':
								if (isOpen) {
									e.preventDefault()
									setIsOpen(false)
									setQuery('')
								}
								break
						}
					}}
					className={[
						'w-full bg-white text-middle-blue text-[12px] md:text-[15px] font-heebo_regular',
						leftPad,
						'pr-10 py-4 md:py-6 rounded-md border border-middle-blue/20 transition-colors',
						disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'cursor-text',
						'hover:border-middle-blue/80 focus:border-middle-blue/60 outline-none',
					].join(' ')}
				/>

				<ChevronDown
					className={`h-4 w-4 text-middle-blue absolute right-6 top-1/2 -translate-y-1/2 transition-transform ${
						isOpen ? 'rotate-180' : ''
					}`}
				/>
			</div>

			{isOpen && (
				<div
					ref={listRef}
					role='listbox'
					className='
                absolute top-full left-0 right-0 z-[9999]
                bg-white rounded-md shadow-lg
                border border-middle-blue/15
                max-h-80 overflow-y-auto custom-scroll
              '>
					{filtered.length === 0 ? (
						<div className='px-4 py-4 text-middle-blue/60 text-[14px]'>No results</div>
					) : (
						filtered.map((opt, i) => {
							const active = value === opt.value
							const highlighted = i === highlightedIndex
							return (
								<button
									type='button'
									key={opt.value}
									data-index={i}
									onClick={() => choose(opt.value)}
									onMouseEnter={() => setHighlightedIndex(i)}
									className={[
										'w-full flex items-center justify-between px-4 md:px-6 py-3.5 md:py-4',
										'text-[14px] md:text-[15px] text-middle-blue font-heebo_regular transition-colors',
										highlighted ? 'bg-middle-blue/10' : active ? 'bg-middle-blue/5' : 'bg-white',
										i !== filtered.length - 1 ? 'border-b border-middle-blue/10' : '',
									].join(' ')}>
									<span className='flex items-center gap-4'>
										{showFlags && opt.code && <Flag iso={opt.code} size={18} title={opt.label} />}
										<span>{opt.label}</span>
									</span>
									{active && <Check className='h-4 w-4 text-middle-blue' />}
								</button>
							)
						})
					)}
				</div>
			)}

			{error && <p className='text-red text-sm mt-2'>{error}</p>}
		</div>
	)
}
