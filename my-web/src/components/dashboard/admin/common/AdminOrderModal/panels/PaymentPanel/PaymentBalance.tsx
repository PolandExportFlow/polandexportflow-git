'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Banknote, Plus, Trash2, Check, X, Tag, BanknoteArrowUp, CreditCard, Edit3 } from 'lucide-react'
import UniversalInput from '@/components/ui/UniwersalInput'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import type { OrderPayment, OrderPaymentTransaction } from '../../AdminOrderTypes'
import { toast } from 'sonner'

// ⭐️ POPRAWIONY KOMPONENT 'FinanceBox' ⭐️
const FinanceBox = ({
	title,
	amount,
	icon,
	onCommit,
	currency,
	variant = 'default', // Dodano 'variant'
}: {
	title: string
	amount: number
	icon: React.ReactNode
	onCommit?: (value: number) => void
	currency: string
	variant?: 'green' | 'orange' | 'default' // Dodano 'variant'
}) => {
	const [isEditing, setIsEditing] = useState(false)
	const formattedAmount = `${(amount || 0).toFixed(2)} ${currency}`

	// --- Logika Stylów skopiowana z ProductPaymentBox ---
	let containerStyle: React.CSSProperties = {
		backgroundColor: '#e9f3ff',
		borderColor: '#BFDBFE',
	}
	let iconContainerStyle: React.CSSProperties = { backgroundColor: '#DBEAFE' }
	let textStyle: React.CSSProperties = { color: '#1E3A8A' }
	let iconStyle: React.CSSProperties = { color: '#1E3A8A' }
	let titleStyle: React.CSSProperties = { color: '#1E40AF' }

	if (variant === 'green') {
		containerStyle = { backgroundColor: '#D1FAE5', borderColor: '#065F4666' }
		iconContainerStyle = { backgroundColor: '#A7F3D0' }
		textStyle = { color: '#065F46' }
		iconStyle = { color: '#065F46' }
		titleStyle = { color: '#065F46' }
	} else if (variant === 'orange') {
		containerStyle = { backgroundColor: '#FFEDD5', borderColor: '#9A341266' }
		iconContainerStyle = { backgroundColor: '#FED7AA' }
		textStyle = { color: '#9A3412' }
		iconStyle = { color: '#9A3412' }
		titleStyle = { color: '#9A3412' }
	}
	// --- Koniec Logiki Stylów ---

	const valueDisplay = onCommit ? (
		<UniversalTableInput
			value={amount}
			onCommit={val => {
				onCommit(val)
				setIsEditing(false)
			}}
			onCancel={() => setIsEditing(false)}
			mode='number'
			align='left'
			decimals={2}
			step={0.01}
			format={n => n.toFixed(2)}
			suffix={currency}
			autoStartEditing={isEditing}
			displayClassName='text-[16px] font-heebo_medium tracking-wider leading-none tabular-nums !p-0 hover:!bg-transparent'
			className='!p-2 !text-[15px]'
			widthPx={120}
		/>
	) : (
		<div className='text-[16px] font-heebo_medium tracking-wider leading-none tabular-nums' style={textStyle}>
			{formattedAmount}
		</div>
	)

	return (
		<div
			className={[
				'flex gap-4 rounded-lg border p-4 mt-2 items-start',
				'transition-colors duration-150',
				onCommit ? 'cursor-pointer' : 'cursor-default',
			].join(' ')}
			style={containerStyle} // ⭐️ Używamy nowych stylów
			onClick={() => onCommit && setIsEditing(true)}>
			<div className='grid place-items-center h-11 w-10 shrink-0 rounded-lg' style={iconContainerStyle}>
				{React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5', style: iconStyle })}
			</div>
			<div>
				<div className='text-[12px] leading-normal tracking-wide mb-2 flex items-center gap-1.5' style={titleStyle}>
					<span>{title}</span>
					{onCommit && <Edit3 className='w-3 h-3' />}
				</div>
				{valueDisplay}
			</div>
		</div>
	)
}

type Props = {
	payment: OrderPayment
	transactions: OrderPaymentTransaction[]
	moneyFmt: (n: number, cur?: string) => string

	onAddTransaction: (amount: number, note: string | null) => void
	onDeleteTransaction: (paymentId: string) => void
	onSetProductSplit: (received: number, due: number) => void
	onSetAdminData: (costs: number, received: number) => void

	methodName: string
	methodKey: string
	currency: string
	getLogo: (type: 'payment', key?: string) => string | undefined
	LogoBox: React.ComponentType<{ src: string | undefined; alt: string }>
	orderType?: string | null
}

export default function PaymentBalance({
	payment,
	transactions,
	moneyFmt,
	onAddTransaction,
	onDeleteTransaction,
	onSetProductSplit,
	onSetAdminData,
	methodName,
	methodKey,
	currency,
	getLogo,
	LogoBox,
	orderType,
}: Props) {
	const totalExpected = payment.total_expected_amount
	const totalReceived = payment.admin_amount_received
	const balancePLN = Math.max(0, totalExpected - totalReceived)

	const itemsReceived = payment.split_received
	const itemsDue = payment.split_due

	const [isAdding, setIsAdding] = useState(false)
	const [newAmount, setNewAmount] = useState('')
	const [newNote, setNewNote] = useState('')
	const [paymentToConfirmDelete, setPaymentToConfirmDelete] = useState<string | null>(null)
	const [errors, setErrors] = useState<{ amount?: string }>({})

	const transactionsTotal = useMemo(() => {
		return transactions.reduce((acc, trx) => acc + trx.transaction_amount, 0)
	}, [transactions])

	const handleCancelAdd = () => {
		setIsAdding(false)
		setNewAmount('')
		setNewNote('')
		setErrors({})
	}

	const handleSaveNewPayment = () => {
		const amountNum = parseFloat(newAmount) || 0
		const newErrors: { amount?: string } = {}

		if (amountNum === 0) {
			newErrors.amount = 'Kwota nie może być 0.'
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors)
			return
		}

		onAddTransaction(amountNum, newNote.trim() || null)
		handleCancelAdd()
	}

	const handleItemDueCommit = (value: number) => {
		onSetProductSplit(itemsReceived, value)
	}

	const handleItemReceivedCommit = (value: number) => {
		onSetProductSplit(value, itemsDue)
	}

	const handleTotalReceivedCommit = (value: number) => {
		onSetAdminData(payment.admin_amount_costs, value)
	}

	return (
		<>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-2 my-4 bg-ds-light-blue rounded-md p-4'>
				<FinanceBox
					title='Do wpłacenia (Łącznie)'
					amount={balancePLN}
					icon={<Banknote className='w-5 h-5' />}
					currency={currency}
					variant='orange'
				/>
				<FinanceBox
					title='Wpłacono (Łącznie)'
					amount={totalReceived}
					icon={<BanknoteArrowUp className='w-5 h-5' />}
					currency={currency}
					onCommit={handleTotalReceivedCommit}
					variant='green'
				/>

				{orderType !== 'Parcel Forwarding' && (
					<>
						<FinanceBox
							title='Do wpłacenia (Produkty)'
							amount={itemsDue}
							icon={<Tag className='w-5 h-5' />}
							onCommit={handleItemDueCommit}
							currency={currency}
							variant='orange'
						/>
						<FinanceBox
							title='Wpłacono (Produkty)'
							amount={itemsReceived}
							icon={<Tag className='w-5 h-5' />}
							onCommit={handleItemReceivedCommit}
							currency={currency}
							variant='green'
						/>
					</>
				)}
			</div>
			<div className='py-1'>
				<DetailRow
					icon={<CreditCard className='w-3.5 h-3.5' />}
					label='Wybrana metoda płatności'
					value={
						<span className='inline-flex items-center gap-2'>
							<span className='tracking-wide'>{methodName}</span>
							{getLogo('payment', methodKey) ? (
								<LogoBox src={getLogo('payment', methodKey)} alt={methodName || 'Payment'} />
							) : null}
						</span>
					}
				/>
				<DetailRow icon={<Banknote className='w-3.5 h-3.5' />} label='Wybrana waluta' value={<span>{currency}</span>} />
			</div>
			<div className='py-5'>
				<div className='flex justify-between items-center mb-3'>
					<h4 className='text-[14px] font-heebo_medium text-middle-blue'>Historia wpłat</h4>
					{!isAdding && (
						<div className='flex justify-end'>
							<button
								onClick={() => setIsAdding(true)}
								className='inline-flex items-center gap-2 px-4 py-3 text-middle-blue rounded-md text-[13px] font-heebo_regular hover:bg-light-blue/50 transition-colors duration-200 tracking-wide'>
								<Plus className='w-4 h-4' />
								Dodaj wpłatę
							</button>
						</div>
					)}
				</div>

				<div className='rounded-md border border-middle-blue overflow-hidden'>
					<div className='max-h-[320px] overflow-y-auto custom-scroll relative'>
						<table className='min-w-full table-fixed text-[13px] caret-transparent'>
							<colgroup>
								<col style={{ width: '15%' }} />
								<col style={{ width: '50%' }} />
								<col style={{ width: '35%' }} />
							</colgroup>
							<thead className='[&_th]:font-normal sticky top-0 z-10'>
								<tr className='bg-dark-blue text-white'>
									<th className='px-0 text-left'>
										<div className='h-[56px] px-6 flex items-center gap-2'>
											<span className='opacity-90'>Nr</span>
										</div>
									</th>
									<th className='px-0 text-left'>
										<div className='h-[56px] px-6 flex items-center gap-2'>
											<span className='opacity-90'>Notatka</span>
										</div>
									</th>
									<th className='px-0 text-right'>
										<div className='h-[56px] px-6 flex items-center gap-2 justify-end w-full'>
											<span className='opacity-90'>Kwota</span>
											<span className='opacity-60 tracking-wide'>({moneyFmt(transactionsTotal, currency)})</span>
										</div>
									</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-ds-border tracking-wide'>
								{transactions.length > 0 ? (
									transactions.map((entry, idx) => {
										const transactionNumber = transactions.length - idx

										return (
											<tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-ds-light-blue'}>
												<td className='p-3 align-middle'>
													<div className='flex items-center justify-start'>
														<button
															onClick={() => setPaymentToConfirmDelete(entry.id)}
															className='group inline-grid place-items-center h-9 w-9 rounded-full border border-light-blue/30 bg-middle-blue/10 text-middle-blue
hover:bg-[#FFE4E6] hover:text-[#9F1239] hover:border-[#FBCFE8] transition-colors'
															title='Usuń wpłatę'
															aria-label='Usuń wpłatę'>
															<span className='tabular-nums group-hover:hidden'>{transactionNumber}</span>
															<Trash2 className='w-4 h-4 hidden group-hover:block' />
														</button>
													</div>
												</td>
												<td className='px-6 py-3 align-middle'>
													<span>{entry.transaction_note || '—'}</span>
												</td>
												<td className='text-right align-middle px-6 py-3'>
													<span className='tabular-nums'>{moneyFmt(entry.transaction_amount, currency)}</span>
												</td>
											</tr>
										)
									})
								) : (
									<tr>
										<td colSpan={3} className='p-6 text-center text-middle-blue/70'>
											Brak zarejestrowanych wpłat.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
				{isAdding && (
					<div className='mt-4 p-5 rounded-lg border border-middle-blue/20 bg-ds-light-blue tracking-wide'>
						<div className='flex justify-between items-center mb-3'>
							<h5 className='text-[14px] font-heebo_regular text-middle-blue p-2 bg-middle-blue/9 rounded-2xl px-4'>
								Dodawanie nowej wpłaty
							</h5>
							<div className='flex justify-end gap-2'>
								<button
									onClick={handleCancelAdd}
									className='inline-flex items-center gap-2 px-4 py-2 border border-middle-blue/20 text-middle-blue/70 rounded-md text-[13px] hover:bg-middle-blue/5 transition-colors'>
									<X className='w-4 h-4' />
									Anuluj
								</button>
								<button
									onClick={handleSaveNewPayment}
									className='inline-flex items-center gap-2 px-4 py-2 bg-dark-blue text-white rounded-md text-[13px] hover:bg-green transition-colors duration-200'>
									<Check className='w-4 h-4' />
									Dodaj
								</button>
							</div>
						</div>
						<div className='grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end'>
							<UniversalInput
								label='Notatka (opcjonalnie)'
								name='new_note'
								value={newNote}
								onChange={setNewNote}
								placeholder='Np. Wpłata od klienta...'
								type='text'
								className='!p-3'
							/>
							<UniversalInput
								label='Kwota'
								name='new_amount'
								value={newAmount}
								onChange={val => {
									setNewAmount(val)
									if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }))
								}}
								placeholder='0.00'
								type='number'
								suffix={currency}
								step='0.01'
								className='!p-3'
								error={errors.amount}
							/>
						</div>
					</div>
				)}
			</div>
			<UniversalConfirmModal
				open={paymentToConfirmDelete !== null}
				title='Usunąć wpłatę?'
				description='Tej operacji nie można cofnąć. Wpłata zostanie trwale usunięta.'
				confirmText='Usuń'
				cancelText='Anuluj'
				tone='danger'
				onConfirm={() => {
					if (paymentToConfirmDelete) {
						onDeleteTransaction(paymentToConfirmDelete)
					}
					setPaymentToConfirmDelete(null)
				}}
				onCancel={() => setPaymentToConfirmDelete(null)}
			/>
		</>
	)
}
