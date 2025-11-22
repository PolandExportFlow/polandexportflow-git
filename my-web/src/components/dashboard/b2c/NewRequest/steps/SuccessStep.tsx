'use client'

import React from 'react'
import { CheckCircle2, Monitor, FileBox, PackageSearch } from 'lucide-react'
import { useRouter } from 'next/navigation'
import UniversalStep from '../common/UniversalStep'

export default function SuccessStep({
	orderNumber,
	redirectTo = '/dashboard',
	ordersHref = '/orders',
}: {
	orderNumber?: string
	redirectTo?: string
	ordersHref?: string
}) {
	const router = useRouter()

	return (
		<UniversalStep
			icon={<CheckCircle2 className='h-6 w-6 md:w-7 md:h-7 text-green' />}
			title='Your order has been submitted!'
			scrollToTopOnMount='smooth'
			panel
			contentClassName='text-middle-blue space-y-6'
			panelClassName='border border-middle-blue/15 bg-ds-light-blue p-4'
			iconWrapperClassName='bg-green/10 ring-1 ring-green/30'>
			<div className='rounded-md bg-white/80 text-middle-blue text-center py-5 md:py-7 px-3 font-made_regular text-[12px] md:text-[16px] tracking-wide'>
				Thank you! Your order has been successfully submitted.
			</div>

			<p className='text-[13px] md:text-[14px] text-middle-blue/80'>
				You can track status in the <b>Orders</b> tab. We’ll notify you about updates.
			</p>

			{orderNumber ? (
				<div className='inline-flex items-center gap-2 rounded-md bg-white px-5 py-4 ring-1 ring-middle-blue/15'>
					<FileBox className='h-4 w-4 text-middle-blue/70' />
					<span className='text-[13px]'>Order number:</span>
					<span className='font-heebo_medium text-dark-blue/95'>{orderNumber}</span>
				</div>
			) : null}

			<div className='flex flex-col sm:flex-row gap-3 pt-2'>
				<button
					type='button'
					onClick={() => router.push(redirectTo)}
					className='inline-flex items-center justify-center gap-2 rounded-md bg-dark-blue text-white px-5 py-4 hover:opacity-90'>
					<Monitor className='h-4 w-4' />
					Go to Dashboard
				</button>
				<a
					href={ordersHref}
					className='inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-4 ring-1 ring-middle-blue/20 hover:ring-middle-blue/40'>
					<PackageSearch className='h-4 w-4 text-middle-blue' />
					Go to Orders
				</a>
			</div>
		</UniversalStep>
	)
}
