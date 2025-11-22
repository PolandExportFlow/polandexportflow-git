'use client'

import React from 'react'
import { Tag, PackagePlus, ChevronRight } from 'lucide-react'

const PARCEL_FORWARDING_TYPE = 'parcel forwarding'
type CheckoutHook = {
	format: (amount: number) => string
}

type Props = {
	orderNumber: string
	orderType?: string | null
	showProductFields: boolean
	productsAmount: number
	serviceAmount: number
	totalAmount: number
	checkout: CheckoutHook
	onOpenModal: (amount: number) => void
}

const greenButtonClass =
	'w-full rounded-md border-1 transition-all duration-200 ease-in-out active:scale-[.99] flex items-center justify-between tracking-wide font-made_regular focus:outline-none focus-visible:ring-2 bg-green/35 text-[#065F46] border-green hover:bg-green/70 focus-visible:ring-green ' +
	'h-[60px] px-4 text-base ' +
	'sm:h-[80px] sm:px-8 text-[14px] sm:text-[15px]'

const IconSizeClass = 'h-4 w-4 sm:h-5 sm:w-5'

const ButtonLabel = ({ label, amount }: { label: string; amount: string }) => (
	<span>
		{label}
		<span className='text-[12px] opacity-75 ml-1 sm:text-[14px]'> ({amount})</span>
	</span>
)

export default function CheckoutButtons({
	orderNumber,
	orderType,
	showProductFields,
	productsAmount,
	serviceAmount,
	totalAmount,
	checkout,
	onOpenModal,
}: Props) {
	const isParcelForwarding = orderType === PARCEL_FORWARDING_TYPE
	const showPayAllCondition = showProductFields && !isParcelForwarding

	return (
		<>
			<div className='flex flex-col gap-2 mt-4'>
				{showProductFields && (
					<button type='button' onClick={() => onOpenModal(productsAmount)} className={greenButtonClass}>
						<div className='flex items-center gap-4'>
							<Tag className={IconSizeClass} />
							<ButtonLabel label='Pay for Items' amount={checkout.format(productsAmount)} />
						</div>
						<div className='flex items-center'></div>
					</button>
				)}
				<button type='button' onClick={() => onOpenModal(serviceAmount)} className={greenButtonClass}>
					<div className='flex items-center gap-4'>
						<PackagePlus className={IconSizeClass} />
						<ButtonLabel label='Pay for Service' amount={checkout.format(serviceAmount)} />
					</div>
					<div className='flex items-center'></div>
				</button>
				{showPayAllCondition && (
					<button type='button' onClick={() => onOpenModal(totalAmount)} className={greenButtonClass}>
						{/* ⭐️ POPRAWKA: Zagnieżdżono ikony, aby zachować mały odstęp między nimi (gap-3), a duży do tekstu (gap-4) ⭐️ */}
						<div className='flex items-center gap-4'>
							<div className='flex items-center gap-3'>
								<Tag className={IconSizeClass} />
								<span className='opacity-50'>+</span>
								<PackagePlus className={IconSizeClass} />
							</div>
							<ButtonLabel label='Pay All' amount={checkout.format(totalAmount)} />
						</div>

						<div className='flex items-center'></div>
					</button>
				)}
			</div>
			<div className='mt-5 text-center text-[12px] sm:text-[14px] opacity-70 leading-7 px-4'>
				Your payment will be <strong>verified within 24 business hours</strong>. If your order status doesn't update
				after this time, please contact us with your order number:{' '}
				<strong className='whitespace-nowrap'>{orderNumber}</strong>
			</div>
		</>
	)
}
