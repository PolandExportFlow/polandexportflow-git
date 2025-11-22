'use client'

import React from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import Icons from '@/components/common/Icons'
import ToCopy from '@/components/common/ToCopy'

export default function RequestFooter() {
	return (
		<div className='flex flex-col md:flex-row justify-between items-start gap-6 mt-5 md:mt-8 bg-middle-blue/4 p-5 md:p-7 rounded-md'>
			{/* LEWO: Support + CTA */}
			<div className='w-full md:w-auto'>
				<span className='block text-[12px] text-middle-blue/70 mb-2'>Support</span>
				<span className='block text-[15px] md:text-[16px] font-heebo_medium text-middle-blue'>
					Need help? Contact us anytime.
				</span>

				<div className='mt-3 flex flex-wrap items-center gap-2'>
					{/* Chat Support */}
					<Link
						href='/dashboard/#messages'
						aria-label='Open Chat Support'
						className='inline-flex items-center justify-center gap-2 rounded-md bg-white border border-middle-blue/20 h-[48px] lg:h-[60px] px-6 md:px-8 text-[15px] md:text-[16px] text-middle-blue font-heebo_medium hover:border-middle-blue hover:bg-middle-blue/5 transition duration-300'
					>
						<MessageSquare className='h-5 w-5 text-middle-blue' />
						<span className='pointer-events-none'>Chat Support</span>
					</Link>

					{/* Messenger */}
					<Link
						href='https://m.me/polandexportflow'
						target='_blank'
						rel='noopener noreferrer'
						aria-label='Contact via Messenger'
						className='flex justify-center items-center h-[48px] lg:h-[60px] w-[48px] lg:w-[60px] bg-white border border-middle-blue/20 rounded-md hover:border-[rgba(0,153,255,1)] hover:bg-[rgba(0,153,255,0.1)] transition duration-300'
					>
						<Icons.messengerIcon className='w-5 h-5 lg:w-6 lg:h-6 text-middle-blue' />
					</Link>

					{/* WhatsApp */}
					<Link
						href='https://wa.me/48784317005'
						target='_blank'
						rel='noopener noreferrer'
						aria-label='Contact via WhatsApp'
						className='flex justify-center items-center h-[48px] lg:h-[60px] w-[48px] lg:w-[60px] bg-white border border-middle-blue/20 rounded-md hover:border-[rgba(37,211,102,1)] hover:bg-[rgba(37,211,102,0.1)] transition duration-300'
					>
						<Icons.whatsappIcon className='w-5 h-5 lg:w-6 lg:h-6 text-middle-blue' />
					</Link>
				</div>
			</div>

			{/* PRAWO: dane kontaktowe */}
			<div className='w-full md:w-auto'>
				<div className='mb-3 md:text-right'>
					<span className='block text-[11px] md:text-[12px] text-middle-blue/70 md:mb-1'>E-mail</span>
					<ToCopy
						text='contact@polandexportflow.com'
						label='contact@polandexportflow.com'
						className='text-[14px] md:text-[16px] font-heebo_medium text-middle-blue'
					/>
				</div>
				<div className='md:text-right'>
					<span className='block text-[11px] md:text-[12px] text-middle-blue/70 md:mb-1'>WhatsApp</span>
					<ToCopy
						text='+48 784 317 005'
						label='+48 784 317 005'
						className='text-[14px] md:text-[16px] font-heebo_medium text-middle-blue'
					/>
				</div>
			</div>
		</div>
	)
}
