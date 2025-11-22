'use client'

import React from 'react'
import dynamic from 'next/dynamic'
// ZMIANA: Poprawiona ścieżka względna dla dynamicznego importu
const LottiePlayer = dynamic(() => import('../Lottie/LottiePlayer'), { ssr: false })
import trustedPEF from '../../../public/icons/trustedPEF.json'
import warehousePEF from '../../../public/icons/warehousePEF.json'
import consolidationPEF from '../../../public/icons/consolidationPEF.json'
import photosPEF from '../../../public/icons/photosPEF.json'
import WhyCard from './WhyCard'

// Uproszczona definicja komponentu (usunięto React.FC)
const WhyChooseUs = () => {
	const cardsData = [
		{
			icon: (
				<div className='w-16 h-16'>
					<LottiePlayer animationData={consolidationPEF} interval={6000} />
				</div>
			),
			title: 'Shipping Consolidation',
			description: <>We combine your multiple orders into one shipment, saving you up to 60% on delivery costs.</>,
			color: 'bg-white',
		},

		{
			icon: (
				<div className='w-16 h-16'>
					<LottiePlayer animationData={warehousePEF} interval={6000} />
				</div>
			),
			title: 'Free Storage',
			description: (
				<>Store your purchases for up to 30 days at no extra cost. Shop when you want, ship when you're ready.</>
			),
			color: 'bg-white',
		},
		{
			icon: (
				<div className='w-16 h-16'>
					<LottiePlayer animationData={trustedPEF} interval={6000} />
				</div>
			),
			title: 'Secure Delivery',
			description: (
				<>Every package is fully insured, securely packed, and includes full tracking for safe delivery worldwide.</>
			),
			color: 'bg-white',
		},
		{
			icon: (
				<div className='w-16 h-16'>
					<LottiePlayer animationData={photosPEF} interval={6000} />
				</div>
			),
			title: 'Verify Your Items',
			description: (
				<>
					Need to check? We can provide detailed photos, letting you verify the contents of your order before you ship.
				</>
			),
			color: 'bg-ds-light-blue',
		},
	]

	return (
		<section id='whyUs' className='section bg-light-blue'>
			<div className='wrapper'>
				<h2 className='text-middle-blue'>Why Choose Us?</h2>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2'>
					{cardsData.map((card, index) => (
						<div key={index}>
							<WhyCard {...card} titleClass='my-5 lg:my-7' cardClass='p-8 bg-white' />
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export default WhyChooseUs
