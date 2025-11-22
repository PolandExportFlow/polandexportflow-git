'use client'

import React, { useMemo, useState } from 'react'
import { Truck, Plus, Trash2, Check } from 'lucide-react'
import UniversalDropdownModal, { UDOption } from '@/components/ui/UniversalDropdownModal'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import UniversalDetailOption from '@/components/ui/UniversalDetailOption'
import { getLogo } from '@/utils/getLogo'

export type QuoteRow = {
	_id: string
	carrierKey: string
	carrierLabel: string
	pricePLN: number
	deliveryDays: string
	note?: string
}

type Props = {
	orderId: string
	/** Zostawiam w API, ale formularz już ich nie używa, zawsze startuje pusty. */
	initial?: Array<Partial<QuoteRow>>
	onSubmit?: (orderId: string, rows: QuoteRow[], validDays: number) => Promise<void> | void
	lastQuoteAt?: string | Date
}

const CARRIERS = [
	{ key: 'fedex', label: 'FedEx' },
	{ key: 'pocztapolska', label: 'Polish Post' },
	{ key: 'inpost', label: 'InPost' },
	{ key: 'dhl', label: 'DHL' },
	{ key: 'ups', label: 'UPS' },
	{ key: 'gls', label: 'GLS' },
	{ key: 'dpd', label: 'DPD' },
] as const

const uid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

const headerSubtitle = (d?: string | Date) => {
	if (!d) return 'brak wyceny'
	const when = new Date(d)
	if (!Number.isFinite(when.getTime())) return 'brak wyceny'
	const date = new Intl.DateTimeFormat('pl-PL', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(when)
	return `Ostatnio wystawiona: ${date}`
}

const H = 'h-[50px]'
const triggerFit = [
	'w-full',
	H,
	'min-h-[50px] max-h-[50px]',
	'[&>button]:w-full [&>button]:h-[50px] [&>button]:min-h-[50px] [&>button]:max-h-[50px]',
	'[&>button]:px-3 [&>button]:py-0',
	'[&>button]:rounded-lg [&>button]:border [&>button]:border-light-blue [&>button]:bg-white',
].join(' ')
const menuFit =
	'z-[9999] min-w-[320px] max-h-[228px] overflow-y-auto custom-scroll overscroll-contain [&_button]:h-[44px]'

function LogoBox({ src, alt }: { src?: string | null; alt?: string }) {
	if (!src) return null
	return (
		<span className='inline-flex pr-2 shrink-0 items-center justify-center h-4 min-w-0'>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={src!} alt={alt || 'logo'} className='block h-6 w-auto max-w-[88px] object-contain' draggable={false} />
		</span>
	)
}

export default function QuoteBuilder({ orderId, initial = [], onSubmit, lastQuoteAt }: Props) {
	const [confirmRow, setConfirmRow] = useState<number | null>(null)
	const [confirmSubmit, setConfirmSubmit] = useState(false)
	const [validDays, setValidDays] = useState<number>(14)

	const blankRow = () => ({
		_id: uid(),
		carrierKey: 'dhl',
		carrierLabel: 'DHL',
		pricePLN: 0,
		deliveryDays: '',
		note: '',
	})

	// 👇 ZAWSZE startujemy od pustego formularza (nie kopiujemy istniejących wycen)
	const [rows, setRows] = useState<QuoteRow[]>([blankRow()])

	const canSubmit = rows.length > 0 && rows.every(r => Number.isFinite(r.pricePLN) && r.pricePLN >= 0)

	const carrierOptions: UDOption[] = useMemo(
		() =>
			CARRIERS.map(({ key, label }) => {
				const logo = getLogo('carrier', key)
				return {
					value: key,
					content: (
						<span className='flex w-full items-center justify-between text-[13px] leading-none whitespace-nowrap'>
							<span className='truncate'>{label}</span>
							<LogoBox src={logo} alt={label} />
						</span>
					),
				}
			}),
		[]
	)

	const setCarrier = (i: number, key: string) =>
		setRows(prev => {
			const label = CARRIERS.find(c => c.key === key)?.label ?? key.toUpperCase()
			const next = [...prev]
			next[i] = { ...next[i], carrierKey: key, carrierLabel: label }
			return next
		})

	const setPrice = (i: number, v: string) => {
		const num = parseFloat(
			(v ?? '')
				.replace(/\s/g, '')
				.replace(/[^0-9,.-]/g, '')
				.replace(',', '.')
		)
		setRows(prev => {
			const n = [...prev]
			n[i] = { ...n[i], pricePLN: Number.isFinite(num) ? Math.max(0, Math.round(num * 100) / 100) : 0 }
			return n
		})
	}

	const setDays = (i: number, v: string) => {
		const clean = (v ?? '')
			.replace(/—|–|−/g, '-')
			.replace(/[^0-9-\s]/g, '')
			.replace(/\s*-\s*/g, '-')
			.replace(/-{2,}/g, '-')
			.trim()
		setRows(prev => {
			const n = [...prev]
			n[i] = { ...n[i], deliveryDays: clean }
			return n
		})
	}

	const setNote = (i: number, v: string | number) =>
		setRows(prev => {
			const n = [...prev]
			n[i] = { ...n[i], note: String(v ?? '') }
			return n
		})

	const addRow = () =>
		setRows(prev => [
			...prev,
			{ _id: uid(), carrierKey: 'ups', carrierLabel: 'UPS', pricePLN: 0, deliveryDays: '', note: '' },
		])

	const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

	const submit = async () => {
		if (!canSubmit) return
		await onSubmit?.(orderId, rows, validDays)
		setRows([blankRow()])
		setValidDays(14)
		setConfirmSubmit(false)
	}

	const headerTitle = (
		<>
			Wycena <span className='opacity-70 text-[13px]'>({headerSubtitle(lastQuoteAt)})</span>
		</>
	)

	return (
		<UniversalDetailOption title={headerTitle} icon={<Truck className='w-4 h-4' />} defaultOpen={false}>
			{/* GÓRNY PASEK */}
			<div className='mb-4 mt-2 flex items-center justify-between text-[13px]'>
				<div />
				<div className='flex items-center'>
					{/* Ważność – wysokość identyczna jak przyciski (h-9) */}
					<div className='flex items-center gap-2 mr-4 text-middle-blue' title='Ważność wyceny'>
						<span className='text-[12px] opacity-70'>Ważna</span>
						<div className='w-[64px] h-9'>
							<input
								type='number'
								inputMode='numeric'
								min={0}
								step={1}
								value={Number.isFinite(validDays) ? validDays : 0}
								onChange={e => {
									const n = Math.max(0, Math.round(Number(e.target.value || 0)))
									setValidDays(n)
								}}
								onKeyDown={e => {
									if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
								}}
								onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
								className='w-full h-9 text-center text-[13px] rounded-md border border-light-blue/70 bg-white px-2 outline-none focus:ring-2 focus:ring-light-blue/50 focus:border-light-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								aria-label='Ważność wyceny w dniach'
							/>
						</div>
						<span className='text-[12px] opacity-70'>dni</span>
					</div>

					<button
						onClick={addRow}
						className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-middle-blue/8 bg-light-blue text-middle-blue hover:bg-middle-blue/20'
						title='Dodaj przewoźnika'
						aria-label='Dodaj przewoźnika'>
						<Plus className='w-4 h-4' />
					</button>

					<button
						disabled={!canSubmit}
						onClick={() => setConfirmSubmit(true)}
						className='ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0B3A66] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
						title='Wystaw wycenę klientowi'
						aria-label='Wystaw wycenę klientowi'>
						<Check className='w-4 h-4' />
					</button>
				</div>
			</div>

			{/* LISTA OFERT */}
			<div className='space-y-3'>
				{rows.map((row, i) => {
					const logo = getLogo('carrier', row.carrierKey)
					const invalidPrice = !(Number.isFinite(row.pricePLN) && row.pricePLN >= 0)
					const invalidDays = !!row.deliveryDays && !/^\d+(-\d+)?$/.test(row.deliveryDays)

					return (
						<div
							key={row._id}
							className='rounded-xl border border-middle-blue/8 bg-light-blue px-3 py-3 md:px-4 md:py-3.5'>
							<div className='grid grid-cols-1 md:grid-cols-[5fr_2.5fr_2.5fr] items-center gap-2'>
								<UniversalDropdownModal
									selected={row.carrierKey}
									className={triggerFit}
									menuClassName={menuFit}
									button={
										<span className='flex w-full items-center justify-between whitespace-nowrap'>
											<span className='text-[13px] truncate'>{row.carrierLabel}</span>
											<LogoBox src={logo} alt={row.carrierLabel} />
										</span>
									}
									options={carrierOptions}
									onSelect={(v: string) => setCarrier(i, v)}
								/>

								<div className={`relative w-full ${H}`}>
									<input
										value={Number.isFinite(row.pricePLN) ? String(row.pricePLN).replace('.', ',') : ''}
										onChange={e => setPrice(i, e.target.value)}
										inputMode='decimal'
										placeholder='0,00'
										className={[
											'w-full h-full bg-white rounded-lg border pl-3 pr-12 text-[14px] outline-none shadow-none',
											'focus:ring-2 focus:ring-light-blue/60',
											invalidPrice ? 'border-red/60' : 'border-light-blue',
											'[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
										].join(' ')}
									/>
									<span className='pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-[13px] opacity-70'>
										PLN
									</span>
								</div>

								<div className={`relative w-full ${H}`}>
									<input
										value={row.deliveryDays}
										onChange={e => setDays(i, e.target.value)}
										inputMode='text'
										placeholder='0'
										className={[
											'w-full h-full bg-white rounded-lg border pl-3 pr-12 text-[14px] outline-none shadow-none',
											'focus:ring-2 focus:ring-light-blue/60',
											invalidDays ? 'border-red/60' : 'border-light-blue',
										].join(' ')}
									/>
									<span className='pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-[13px] opacity-70'>
										dni
									</span>
								</div>
							</div>

							{/* NOTATKA + delete */}
							<div className='mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-2'>
								<textarea
									value={row.note ?? ''}
									onChange={e => setNote(i, e.target.value)}
									placeholder='Notatka do wyceny (opcjonalnie)…'
									className='w-full h-[50px] min-h-[50px] max-h-[280px] resize-y rounded-lg border border-light-blue bg-white px-3 py-[13px] text-[14px] leading-[22px] outline-none focus:ring-2 focus:ring-light-blue/60'
									aria-label='Notatka do wyceny'
								/>

								<button
									onClick={() => setConfirmRow(i)}
									className='self-start h-[50px] w-[50px] grid place-items-center rounded-lg border
                             border-light-blue/30 bg-white text-middle-blue/70
                             hover:bg-[#FFE4E6] hover:text-[#9F1239] hover:border-[#FBCFE8]
                             transition-colors duration-200'
									aria-label='Usuń ofertę'>
									<Trash2 className='w-4 h-4' />
								</button>
							</div>
						</div>
					)
				})}
			</div>

			{/* MODALE POTWIERDZEŃ */}
			<UniversalConfirmModal
				key={confirmRow ?? -1}
				open={confirmRow !== null}
				title='Usunąć tę ofertę?'
				description='Tej operacji nie można cofnąć.'
				confirmText='Usuń'
				cancelText='Anuluj'
				tone='danger'
				onConfirm={() => {
					const idx = confirmRow
					setConfirmRow(null)
					if (idx !== null) removeRow(idx)
				}}
				onCancel={() => setConfirmRow(null)}
			/>

			<UniversalConfirmModal
				open={confirmSubmit}
				title='Wysłać wycenę do klienta?'
				description={(() => {
					const fmtPrice = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)} PLN` : '0.00 PLN')
					const fmtDays = (s?: string) => {
						const str = (s || '').trim()
						return str ? `${str.replace(/-/g, '–')} dni` : '0 dni'
					}
					const lines = rows.map((r, idx) => {
						const header = `${idx + 1}) ${r.carrierLabel} ${fmtPrice(r.pricePLN)}, Dostawa: ${fmtDays(r.deliveryDays)}`
						const note = (r.note || '').trim()
						const noteLine = note ? `\n   Notatka: ${note.length > 140 ? note.slice(0, 137) + '…' : note}` : ''
						return header + noteLine + '\n'
					})
					return [`Wysyłasz ${rows.length} ofert(y).`, `Ważność: ${validDays} dni`, '', ...lines].join('\n')
				})()}
				confirmText='Wyślij wycenę'
				cancelText='Anuluj'
				tone='default'
				onConfirm={submit}
				onCancel={() => setConfirmSubmit(false)}
			/>
		</UniversalDetailOption>
	)
}
