// app/.../sections/.../CurrencyWidget.tsx
'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { RefreshCcw } from 'lucide-react'
import UniversalAdminCard from '../../../utils/UniversalAdminCard'
import { useCurrencyRates, SYMBOLS } from './useCurrencyRates'

/** Minimalny input walutowy */
function FxInput({
	value,
	onCommit,
	widthPx = 90,
	className = '',
}: {
	value: number
	onCommit: (n: number) => void
	widthPx?: number
	className?: string
}) {
	const fmt2 = useMemo(() => (n: number) => Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '', [])

	const [text, setText] = useState<string>(fmt2(value))
	const [orig, setOrig] = useState<string>(fmt2(value))

	useEffect(() => {
		const incoming = fmt2(value)
		if (incoming !== orig) {
			setText(incoming)
			setOrig(incoming)
		}
	}, [value]) // eslint-disable-line

	const pattern = useMemo(() => /^(\d+)?([.,]\d{0,2})?$/, [])

	const parseToNumber = (s: string): number | undefined => {
		const normalized = s.replace(/\s/g, '').replace(',', '.')
		if (!pattern.test(s)) return undefined
		const n = Number(normalized)
		if (!Number.isFinite(n)) return undefined
		return Math.round(n * 100) / 100
	}

	const commit = () => {
		const s = text.trim()
		const parsed = parseToNumber(s)
		if (parsed === undefined || parsed <= 0) {
			setText(orig)
			return
		}
		onCommit(parsed)
		const pretty = fmt2(parsed)
		setOrig(pretty)
		setText(pretty)
	}

	return (
		<input
			type='text'
			inputMode='decimal'
			value={text}
			onChange={e => {
				const v = e.currentTarget.value
				if (v === '' || pattern.test(v)) setText(v)
			}}
			onKeyDown={e => {
				if (e.key === 'Enter') e.currentTarget.blur()
				if (e.key === 'Escape') {
					setText(orig)
					e.currentTarget.blur()
				}
			}}
			onBlur={commit}
			aria-label='Kurs waluty do PLN'
			className={[
				'h-[42px] w-full outline-none border-0 focus:ring-0',
				'text-center text-[15px] mx-2 text-middle-blue tabular-nums whitespace-nowrap',
				className,
			].join(' ')}
			style={{ width: widthPx }}
			placeholder='0,00'
		/>
	)
}

const useFxFormatter = (maxFrac = 2) =>
	useMemo(
		() =>
			new Intl.NumberFormat('pl-PL', {
				minimumFractionDigits: maxFrac,
				maximumFractionDigits: maxFrac,
			}),
		[maxFrac]
	)

export default function CurrencyWidget() {
	const { list, loadingReal, errorReal, errorAdmin, updatedAt, setLocalRate, refresh } = useCurrencyRates()
	const fmt2 = useFxFormatter(2)

	return (
		<UniversalAdminCard className='h-full pb-4'>
			{(errorReal || errorAdmin) && (
				<div role='alert' className='text-[12px] mb-3 rounded-lg border border-red bg-red text-white px-3 py-2'>
					{errorReal || errorAdmin}
				</div>
			)}

			{/* GRID: mobile 1 kolumna; desktop 35% / 65% */}
			<div className='grid [grid-template-columns:minmax(0,40%)_minmax(0,60%)] gap-4'>
				{/* LEWA kolumna — Globalne kursy (NBP) */}
				<div className='flex flex-col min-w-0'>
					{/* Header */}
					<div className='flex items-center justify-between px-1'>
						<div className='text-[12px] font-heebo_medium text-middle-blue/80 truncate'>
							Globalne kursy <span className='text-middle-blue/60'>· NBP</span>
							{updatedAt ? <span className='text-middle-blue/50'> · {updatedAt}</span> : null}
						</div>
					</div>

					{/* Lista kursów — brak sztywnych wysokości */}
					<div className='mt-2 space-y-2.5 md:space-y-3 min-w-0'>
						{list.map(({ code, real }) => (
							<div
								key={`real-${code}`}
								className='flex items-center justify-between h-[56px] md:h-[60px] px-4 rounded-2xl border border-middle-blue/20 bg-middle-blue/10 hover:bg-middle-blue/15 transition-colors min-w-0'>
								<span className='text-middle-blue text-[14px] md:text-[15px] font-heebo_medium truncate'>
									{SYMBOLS[code] ?? ''} {code}
								</span>
								<span className='text-middle-blue text-[14px] md:text-[15px] font-heebo_regular tabular-nums whitespace-nowrap'>
									{typeof real === 'number' ? `${fmt2.format(real)} PLN` : '—'}
								</span>
							</div>
						))}
					</div>

					{/* Footer — Odśwież przeniesiony NA DÓŁ, żeby nic nie zasłaniał */}
					<div className='mt-3 flex justify-end px-1'>
						<button
							onClick={refresh}
							disabled={loadingReal}
							className={[
								'inline-flex items-center gap-2 text-[12px] transition-colors',
								loadingReal ? 'text-middle-blue/40 cursor-not-allowed' : 'text-middle-blue/70 hover:text-middle-blue',
							].join(' ')}
							title='Odśwież realne kursy (NBP)'>
							<RefreshCcw className={`w-3 h-3 ${loadingReal ? 'animate-spin' : ''}`} />
							{loadingReal ? 'Aktualizuję…' : 'Odśwież'}
						</button>
					</div>
				</div>

				{/* PRAWA kolumna — Nasze kursy (edytowalne) */}
				<div className='flex flex-col min-w-0'>
					<div className='text-[12px] font-heebo_medium text-middle-blue/80 px-1'>Nasze kursy</div>

					<div className='mt-2 space-y-2.5 md:space-y-3 min-w-0'>
						{list.map(({ code, real, custom, saving, savedOk }) => {
							const start = Number.isFinite(custom as number)
								? (custom as number)
								: Number.isFinite(real as number)
								? (real as number)
								: 0

							return (
								<div key={`admin-${code}`} className='space-y-1 min-w-0'>
									<div className='flex items-center justify-between h-[56px] md:h-[60px] pl-4 pr-2 rounded-2xl border border-middle-blue/20 bg-middle-blue/10 hover:bg-middle-blue/15 transition-colors min-w-0'>
										{/* Lewa etykieta + responsywny tekst */}
										<span className='flex items-center gap-2 text-middle-blue text-[14px] md:text-[15px] font-heebo_medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%] md:max-w-none'>
											<span className='md:hidden'>
												{SYMBOLS[code] ?? ''} {code}
											</span>
											<span className='hidden md:inline'>
												{SYMBOLS[code] ?? ''} {code} to PLN
											</span>
										</span>

										{/* Kapsuła z inputem */}
										<div className='flex items-center gap-2 h-11 md:h-12 rounded-xl px-2 md:px-3 shrink-0'>
											<FxInput
												value={start}
												onCommit={n => setLocalRate(code, n)}
												widthPx={88}
												className='tracking-wide'
											/>
											<span className='text-[14px] md:text-[15px] text-middle-blue whitespace-nowrap'>PLN</span>
										</div>
									</div>

									{/* Status zapisu */}
									<div className='px-4' aria-live='polite'>
										{saving ? (
											<div className='text-[11px] text-middle-blue/60 text-right'>Zapisywanie…</div>
										) : savedOk ? (
											<div className='text-[11px] text-middle-blue/90 text-right'>Zapisane</div>
										) : null}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</UniversalAdminCard>
	)
}
