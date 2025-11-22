'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Calculator as CalcIcon } from 'lucide-react'
import UniversalDropdownModal, { type UDOption } from '@/components/ui/UniversalDropdownModal'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import UniversalDetailOption from '@/components/ui/UniversalDetailOption'
import { getLogo } from '@/utils/getLogo'

type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP'

/** Dozwolone metody płatności w kalkulatorze */
const ALLOWED_METHODS = ['paypal', 'wise', 'revolut', 'zen'] as const
type AllowedMethod = (typeof ALLOWED_METHODS)[number]

type Props = {
	/** kursy: ile PLN za 1 jednostkę waluty (np. EUR: 4.30) */
	currencyRates?: Partial<Record<Currency, number>>
	defaultCurrency?: Currency
	/** nazwy metod (dowolne stringi) — wewnątrz i tak przefiltrujemy do dozwolonych */
	paymentMethods?: string[]
	/** mapa procentów (dowolne klucze); użyjemy tylko tych z ALLOWED_METHODS */
	paymentMethodPct?: Record<string, number>
	serviceFeeOptionsPct?: number[]
	onChangeComputed?: (payload: {
		currency: Currency
		method: AllowedMethod
		products: number
		shipping: number
		base: number
		servicePct: number
		serviceFee: number
		paymentPct: number
		paymentFee: number
		total: number
		profit: number
	}) => void
}

const CURRENCY_SYMBOL: Record<Currency, string> = { PLN: 'zł', EUR: '€', USD: '$', GBP: '£' }

// domyślne konfiguracje
const DEFAULT_RATES: Record<Currency, number> = { PLN: 1, EUR: 4.3, USD: 3.95, GBP: 5.1 }
const DEFAULT_METHOD_FEES: Record<AllowedMethod, number> = {
	paypal: 3.9,
	wise: 0.6,
	revolut: 1.0,
	zen: 1.2,
}
const DEFAULT_SERVICE_LIST = [4, 5, 6, 7, 8, 9]

// helpers
const round2 = (n: number) => Math.round(n * 100) / 100
const safeRate = (r?: number) => (typeof r === 'number' && isFinite(r) && r > 0 ? r : 1)
const plnPerUnit = (currency: Currency, rates: Record<Currency, number>) => safeRate(rates[currency])
const toPLN = (amountInCurrency: number, currency: Currency, rates: Record<Currency, number>) =>
	amountInCurrency * plnPerUnit(currency, rates)
const fromPLN = (amountPLN: number, currency: Currency, rates: Record<Currency, number>) =>
	amountPLN / plnPerUnit(currency, rates)

function Logo({ kind }: { kind: string }) {
	const src = getLogo('payment', kind as any)
	if (!src) return null
	return (
		<span className='inline-flex items-center justify-center shrink-0' style={{ height: 18, lineHeight: 0 }}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={src} alt={kind} className='object-contain block' style={{ height: '100%', width: 'auto' }} />
		</span>
	)
}

export default function QuoteCalculator({
	currencyRates,
	defaultCurrency = 'PLN',
	paymentMethods,
	paymentMethodPct,
	serviceFeeOptionsPct,
	onChangeComputed,
}: Props) {
	// 1) Kursy
	const rates: Record<Currency, number> = { ...DEFAULT_RATES, ...(currencyRates || {}) } as Record<Currency, number>

	// 2) Metody płatności — zawężamy do dozwolonych
	const methods: AllowedMethod[] = useMemo(() => {
		const src = (paymentMethods && paymentMethods.length ? paymentMethods : ALLOWED_METHODS).map(s =>
			String(s).toLowerCase().trim()
		)
		return ALLOWED_METHODS.filter(m => src.includes(m))
	}, [paymentMethods])

	// 3) Procenty dla obsługiwanych metod
	const methodFees: Record<AllowedMethod, number> = useMemo(() => {
		const out = { ...DEFAULT_METHOD_FEES }
		for (const m of ALLOWED_METHODS) {
			const v = paymentMethodPct?.[m]
			if (typeof v === 'number' && isFinite(v) && v >= 0) out[m] = v
		}
		return out
	}, [paymentMethodPct])

	// 4) Lista service fee
	const serviceList = useMemo(() => {
		const src = serviceFeeOptionsPct?.length ? serviceFeeOptionsPct : DEFAULT_SERVICE_LIST
		return Array.from(new Set(src.filter(v => Number.isFinite(v as number)).map(v => Math.round(v as number)))).sort(
			(a, b) => a - b
		)
	}, [serviceFeeOptionsPct])

	// stany
	const [currency, setCurrency] = useState<Currency>(defaultCurrency)
	const [method, setMethod] = useState<AllowedMethod>(methods[0] ?? 'paypal')
	const [servicePct, setServicePct] = useState<number>(serviceList[0] ?? 7)

	// gdy lista metod się zmieni, utrzymaj poprawny wybór
	useEffect(() => {
		if (!methods.includes(method)) setMethod(methods[0] ?? 'paypal')
	}, [methods, method])

	// wartości w PLN (źródło prawdy)
	const [productsPLN, setProductsPLN] = useState(0)
	const [shippingPLN, setShippingPLN] = useState(0)
	const [costsPLN, setCostsPLN] = useState(0)

	// upewnij się, że servicePct jest z listy
	useEffect(() => {
		if (serviceList.length && !serviceList.includes(servicePct)) setServicePct(serviceList[0])
	}, [serviceList, servicePct])

	// formatowanie
	const moneyFmt = useMemo(
		() =>
			new Intl.NumberFormat('pl-PL', {
				style: 'currency',
				currency,
				maximumFractionDigits: 2,
			}),
		[currency]
	)
	const money = (n: number) => moneyFmt.format(round2(n))
	const fmtRate = (r?: number) => (typeof r === 'number' && Number.isFinite(r) ? r.toFixed(2) : '—')

	// obliczenia w PLN
	const basePLN = productsPLN + shippingPLN
	const serviceFeePLN = basePLN * (servicePct / 100)
	const payPct = methodFees[method] ?? 0
	const paymentFeePLN = basePLN * (payPct / 100)
	const totalPLN = basePLN + serviceFeePLN + paymentFeePLN
	const profitPLN = totalPLN - costsPLN

	// wartości do wyświetlenia (konwersja)
	const productsDisp = fromPLN(productsPLN, currency, rates)
	const shippingDisp = fromPLN(shippingPLN, currency, rates)
	const costsDisp = fromPLN(costsPLN, currency, rates)
	const baseDisp = fromPLN(basePLN, currency, rates)
	const serviceFeeDisp = fromPLN(serviceFeePLN, currency, rates)
	const paymentFeeDisp = fromPLN(paymentFeePLN, currency, rates)
	const totalDisp = fromPLN(totalPLN, currency, rates)
	const profitDisp = fromPLN(profitPLN, currency, rates)

	// callback na zewnątrz
	useEffect(() => {
		onChangeComputed?.({
			currency,
			method,
			products: round2(productsDisp),
			shipping: round2(shippingDisp),
			base: round2(baseDisp),
			servicePct,
			serviceFee: round2(serviceFeeDisp),
			paymentPct: payPct,
			paymentFee: round2(paymentFeeDisp),
			total: round2(totalDisp),
			profit: round2(profitDisp),
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currency, method, productsPLN, shippingPLN, costsPLN, servicePct, payPct])

	// dropdowny
	const currencyOptions: UDOption[] = (['PLN', 'EUR', 'USD', 'GBP'] as Currency[]).map(c => ({
		value: String(c),
		content: (
			<div className='flex items-center justify-between w-full text-[13px]'>
				<span>{c}</span>
				<span className='opacity-60 ml-3'>({fmtRate(rates[c])})</span>
			</div>
		),
	}))
	const methodOptions: UDOption[] = methods.map(m => ({
		value: m,
		content: (
			<div className='flex items-center justify-between w-full text-[13px]'>
				<span className='inline-flex items-center gap-2'>
					<Logo kind={m} />
				</span>
				<span className='opacity-60 ml-3'>({(methodFees[m] ?? 0).toFixed(1)}%)</span>
			</div>
		),
	}))
	const serviceOptions: UDOption[] = serviceList.map(pct => ({
		value: String(pct),
		content: <span className='text-[13px]'>{pct}%</span>,
	}))
	const serviceKey = `svc-${serviceList.join('-')}`

	const triggerFit = [
		'w-full',
		'[&>button]:h-[44px] [&>button]:w-full [&>button]:justify-between [&>button]:px-3 [&>button]:py-2',
		'[&>button]:bg-white [&>button]:border [&>button]:border-light-blue [&>button]:rounded-lg',
	].join(' ')
	const menuFit = 'min-w-[260px] z-[9999] [&_button]:h-[42px]'
	const SmallLabel = ({ children }: { children: React.ReactNode }) => (
		<span className='block text-xs leading-snug mb-3 opacity-70 select-none'>{children}</span>
	)

	// input → PLN
	const handleCommitCurrencyNumber = (next: number | string, setterPLN: (v: number) => void) => {
		const n = typeof next === 'number' ? next : Number(String(next).replace(',', '.').replace(/\s/g, ''))
		if (!Number.isFinite(n) || n < 0) return
		setterPLN(round2(toPLN(n, currency, rates)))
	}

	return (
		<UniversalDetailOption title='Kalkulator' icon={<CalcIcon className='w-4 h-4' />} defaultOpen={false}>
			<div className='p-6 space-y-8'>
				{/* 20% / 60% / 20% */}
				<div className='grid grid-cols-1 md:grid-cols-[2fr_6fr_2fr] gap-4'>
					{/* Waluta */}
					<div className='w-full'>
						<SmallLabel>Waluta</SmallLabel>
						<UniversalDropdownModal
							selected={String(currency)}
							className={triggerFit}
							menuClassName={menuFit}
							options={currencyOptions}
							button={
								<div className='flex w-full items-center justify-between text-[13px]'>
									<span>{currency}</span>
									<span className='opacity-60 ml-3'>({fmtRate(rates[currency])})</span>
								</div>
							}
							onSelect={(v: string) => setCurrency(v as Currency)}
						/>
					</div>

					{/* Metoda płatności */}
					<div className='w-full'>
						<SmallLabel>Metoda płatności</SmallLabel>
						<UniversalDropdownModal
							selected={method}
							className={triggerFit}
							menuClassName={menuFit}
							options={methodOptions}
							button={
								<div className='flex w-full items-center justify-between text-[13px]'>
									<span className='inline-flex items-center gap-2'>
										<Logo kind={method} />
									</span>
									<span className='opacity-60 ml-3'>({(methodFees[method] || 0).toFixed(1)}%)</span>
								</div>
							}
							onSelect={(v: string) =>
								setMethod((ALLOWED_METHODS.includes(v as any) ? v : methods[0] || 'paypal') as AllowedMethod)
							}
						/>
					</div>

					{/* Service fee */}
					<div className='w-full'>
						<SmallLabel>Service fee</SmallLabel>
						<UniversalDropdownModal
							key={serviceKey}
							selected={String(servicePct)}
							className={triggerFit}
							menuClassName={menuFit}
							options={serviceOptions}
							button={<div className='text-[13px]'>{servicePct}%</div>}
							onSelect={(v: string) => setServicePct(Number(v))}
						/>
					</div>
				</div>

				{/* produkty / dostawa / koszty */}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
					<div className='w-full'>
						<SmallLabel>Wartość produktów</SmallLabel>
						<UniversalTableInput
							value={round2(productsDisp)}
							mode='number'
							align='left'
							step='0.01'
							suffix={CURRENCY_SYMBOL[currency]}
							displayClassName='text-[14px] bg-white border border-light-blue rounded-lg'
							onCommit={next => handleCommitCurrencyNumber(next, setProductsPLN)}
						/>
					</div>

					<div className='w-full'>
						<SmallLabel>Wartość dostawy</SmallLabel>
						<UniversalTableInput
							value={round2(shippingDisp)}
							mode='number'
							align='left'
							step='0.01'
							suffix={CURRENCY_SYMBOL[currency]}
							displayClassName='text-[14px] bg-white border border-light-blue rounded-lg'
							onCommit={next => handleCommitCurrencyNumber(next, setShippingPLN)}
						/>
					</div>

					<div className='w-full'>
						<SmallLabel>Koszty</SmallLabel>
						<UniversalTableInput
							value={round2(costsDisp)}
							mode='number'
							align='left'
							step='0.01'
							suffix={CURRENCY_SYMBOL[currency]}
							displayClassName='text-[14px] bg-white border border-light-blue rounded-lg'
							onCommit={next => handleCommitCurrencyNumber(next, setCostsPLN)}
						/>
					</div>
				</div>

				{/* PODSUMOWANIE */}
				<div className='rounded-xl border border-middle-blue/16 bg-light-blue/40 p-5'>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-[13px]'>
						<div className='flex items-center justify-between'>
							<span className='opacity-70'>Wartość</span>
							<span className='font-heebo_medium'>{money(baseDisp)}</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='opacity-70'>Service fee ({servicePct}%)</span>
							<span className='font-heebo_medium'>{money(serviceFeeDisp)}</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='opacity-70'>Opłata płatnicza ({(payPct || 0).toFixed(1)}%)</span>
							<span className='font-heebo_medium'>{money(paymentFeeDisp)}</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='opacity-70'>Zysk po kosztach</span>
							<span className='font-heebo_medium'>{money(profitDisp)}</span>
						</div>
					</div>

					<div className='my-5 border-t-1 border-middle-blue/18' />

					<div className='flex items-center justify-between'>
						<span className='opacity-80 text-[14px]'>Razem</span>
						<span className='font-heebo_medium text-middle-blue text-[16px]'>{money(totalDisp)}</span>
					</div>
				</div>
			</div>
		</UniversalDetailOption>
	)
}
