'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Wallet, Check, X } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import QuoteBuilder from './QuoteBuilder'
import QuoteCalculator from './QuoteCalculator'
import PaymentStatus from './PaymentStatus'
import PaymentBalance from './PaymentBalance'
import PaymentAdminBalance from './PaymentAdminBalance'
import QuoteList from './QuoteList'
import PaymentAdminReceipt, { type AdminCheckoutBreakdown } from './PaymentAdminReceipt'
import type { PaymentBlock, ShippingQuote } from '../../AdminOrderTypes'
import { getLogo } from '@/utils/getLogo'
import type { AdminQuoteRowIn } from './payment.service'
import type { UseOrderModalReturn } from '../../hooks/useOrderModal'

const round2 = (n: any) => Math.round(n * 100) / 100

const LogoBox = ({ src, alt }: any) => (
	<span className='inline-flex items-center h-5 min-w-0 leading-none'>
		<img src={src || ''} alt={alt || 'logo'} className='block h-[16px] w-auto max-w-[96px] object-contain' />
	</span>
)

const CURRENCY_SYMBOL = { PLN: 'zł', EUR: '€', USD: '$', GBP: '£' }
const moneyFmt = (n: number, cur: string = 'PLN') => {
	const code = cur.toUpperCase() as keyof typeof CURRENCY_SYMBOL
	return `${(n || 0).toFixed(2)} ${CURRENCY_SYMBOL[code] || code}`
}

type Props = {
	payHook: UseOrderModalReturn
	quotes: ShippingQuote[]
	orderId: string
	onCreateQuotes: (orderId: string, rows: AdminQuoteRowIn[], validDays: number) => void
	onDeleteQuote: (id: string) => void
}

export default function PaymentPanel({ payHook, quotes, orderId, onCreateQuotes, onDeleteQuote }: Props) {
	const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)

	const {
		loading,
		error,
		status, // <-- POBIERAMY STATUS
		payment: paymentRecord,
		transactions,
		fxRates,
		targetAmountPLN,
		setPaymentStatus,
		setServiceFee,
		setPaymentNote,
		setAdminData,
		setProductSplit,
		addTransaction,
		deleteTransaction,
	} = payHook

	const shippingCost = useMemo(() => {
		return (paymentRecord?.total_subtotal || 0) - (paymentRecord?.total_items_value || 0)
	}, [paymentRecord])

	const mergedPayment: PaymentBlock = useMemo(
		() => ({
			// ⭐️ USUNIĘTO: payment_method_name: paymentRecord?.payment_method_name ?? 'Brak',
			payment_method_code: paymentRecord?.payment_method_code ?? undefined,
			payment_currency: paymentRecord?.payment_currency ?? 'PLN',
			payment_status: paymentRecord?.payment_status ?? 'none',
			payment_fee_pct: paymentRecord?.payment_fee_pct ?? 0,
			paymentNote: paymentRecord?.payment_note,
			summary: {
				products: String(paymentRecord?.total_items_value ?? 0),
				shipping: String(shippingCost),
				service_fee: String(paymentRecord?.payment_service_fee ?? 0),
				total_received_amount: String(paymentRecord?.admin_amount_received ?? 0),
				total_costs_amount: String(paymentRecord?.admin_amount_costs ?? 0),
			},
		}),
		[paymentRecord, shippingCost]
	)

	const createEditableInput = (value: number, onCommit: (v: string | number) => void, onCancel: () => void) => (
		<UniversalTableInput
			value={value}
			mode='number'
			suffix={CURRENCY_SYMBOL[paymentRecord?.payment_currency as 'PLN'] || 'PLN'}
			align='right'
			step={0.01}
			widthPx={74}
			autoStartEditing
			onCommit={onCommit}
			onCancel={onCancel}
		/>
	)

	const breakdown = useMemo((): AdminCheckoutBreakdown => {
		if (!paymentRecord) {
			return {
				productsPLN: 0,
				shippingPLN: 0,
				serviceFeePct: 0,
				serviceFeePLN: 0,
				subtotalPLN: 0,
				paymentFeePct: 0,
				paymentFeePLN: 0,
				totalPLN: 0,
			}
		}

		const products = paymentRecord.total_items_value
		const servicePct = paymentRecord.payment_service_fee
		const serviceFee = paymentRecord.total_service_fee
		const subtotal = products + shippingCost + serviceFee
		const paymentPct = paymentRecord.payment_fee_pct || 0
		const paymentFee = paymentRecord.payment_fee
		const total = paymentRecord.total_expected_amount

		return {
			productsPLN: products,
			shippingPLN: shippingCost,
			serviceFeePct: servicePct,
			serviceFeePLN: serviceFee,
			subtotalPLN: subtotal,
			paymentFeePct: paymentPct,
			paymentFeePLN: paymentFee,
			totalPLN: total,
		}
	}, [paymentRecord, shippingCost])

	const acceptedQuote =
		quotes.find(q => String(q.quote_status || '').toLowerCase() === 'accepted') || quotes.find(q => !!q.is_selected)

	const currentCurrency = paymentRecord?.payment_currency ?? 'PLN'
	const currentMethodKey = paymentRecord?.payment_method_code ?? 'paypal'
	const currentMethodName = (paymentRecord as any)?.payment_method_name ?? currentMethodKey.toUpperCase()

	const normalizedQuotesForList = useMemo(() => {
		return quotes.map(q => ({
			...q,
			quote_carrier_fee: Number(q.quote_carrier_fee) || 0,
		}))
	}, [quotes])

	return (
		<UniversalDetail title='Płatność i wysyłka' icon={<Wallet className='h-5 w-5' />}>
			{loading ? (
				<div className='p-4 text-center text-middle-blue/70'>Ładowanie danych płatności...</div>
			) : error ? (
				<div className='p-4 text-center text-red-700'>Błąd ładowania danych: {error}</div>
			) : !paymentRecord ? (
				<div className='p-4 text-center text-middle-blue/70'>Brak danych o płatności.</div>
			) : (
				<>
					<PaymentStatus
						paymentStatus={paymentRecord.payment_status}
						onChangePaymentStatus={setPaymentStatus}
						servicePct={paymentRecord.payment_service_fee}
						onUpsertServiceFeePct={setServiceFee}
						note={paymentRecord.payment_note ?? ''}
						onUpsertPaymentNote={setPaymentNote}
					/>
					<QuoteBuilder orderId={orderId} initial={[]} onSubmit={onCreateQuotes} />

					<QuoteList
						quotes={normalizedQuotesForList as any}
						moneyFmt={moneyFmt}
						onDeleteQuote={quoteId => setQuoteToDelete(quoteId)}
					/>
					<PaymentBalance
						payment={paymentRecord}
						transactions={transactions}
						moneyFmt={moneyFmt}
						onAddTransaction={addTransaction}
						onDeleteTransaction={deleteTransaction}
						onSetProductSplit={setProductSplit}
						onSetAdminData={setAdminData}
						methodName={currentMethodName}
						methodKey={currentMethodKey}
						currency={currentCurrency}
						getLogo={getLogo}
						LogoBox={LogoBox}
						orderType={status?.order_type}
					/>
					<PaymentAdminBalance
						revenuePLN={paymentRecord.admin_amount_received}
						costPLN={paymentRecord.admin_amount_costs}
						profitPLN={paymentRecord.admin_amount_profit}
						onSetAdminData={setAdminData}
						moneyFmt={moneyFmt}
						createEditableInput={createEditableInput}
					/>
					<PaymentAdminReceipt
						currency={currentCurrency}
						breakdown={breakdown}
						methodKey={currentMethodKey}
						carrierLabel={acceptedQuote?.quote_carrier}
						fxRates={fxRates}
					/>
					<QuoteCalculator
						currencyRates={fxRates}
						paymentMethods={['paypal', 'wise', 'revolut']}
						paymentMethodPct={{ paypal: 3.9, wise: 1.0, revolut: 1.2 }}
						serviceFeeOptionsPct={[0, 4, 5, 6, 7, 8, 9]}
					/>

					<UniversalConfirmModal
						open={quoteToDelete !== null}
						title={`Usunąć wycenę?`}
						description={'Tej operacji nie można cofnąć. Wycena zostanie trwale usunięta.'}
						confirmText='Usuń'
						cancelText='Anuluj'
						tone='danger'
						onConfirm={() => {
							if (quoteToDelete) {
								onDeleteQuote(quoteToDelete)
							}
							setQuoteToDelete(null)
						}}
						onCancel={() => setQuoteToDelete(null)}
					/>
				</>
			)}
		</UniversalDetail>
	)
}
