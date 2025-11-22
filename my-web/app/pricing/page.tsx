import Pricing from '@/components/pages/Pricing'
import ServicesTable from '@/components/common/ServicesTable'
import Script from 'next/script'

export const metadata = {
	title: 'Transparent Pricing for Export & Parcel Forwarding | PolandExportFlow',
	description:
		'Check our transparent and competitive pricing for export and parcel forwarding from Poland. No hidden fees—just reliable international shipping at fair rates.',
	keywords: [
		'Poland export pricing',
		'parcel forwarding rates',
		'wholesale shipping costs',
		'Polish logistics fees',
		'international shipping rates',
		'cost of importing from Poland',
		'Poland parcel forwarding fees',
	],
	alternates: {
		canonical: 'https://polandexportflow.com/pricing',
	},
	openGraph: {
		title: 'Transparent Pricing for Export & Parcel Forwarding | PolandExportFlow',
		description:
			'Check our competitive export and parcel forwarding pricing from Poland. No hidden fees—just affordable and efficient global shipping.',
		url: 'https://polandexportflow.com/pricing',
		images: [
			{
				url: '/pricing-og.jpg',
				width: 1200,
				height: 630,
				alt: 'Transparent Export & Parcel Forwarding Pricing',
			},
		],
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Transparent Pricing for Export & Parcel Forwarding | PolandExportFlow',
		description:
			'Check our competitive export and parcel forwarding pricing from Poland. No hidden fees—just affordable and efficient global shipping.',
		images: ['/pricing-og.jpg'],
	},
}

export default function PricingPage() {
	return (
		<div>
			<Pricing />
			<ServicesTable />

			{/* Dane strukturalne Schema.org */}
			<Script
				id='pricing-structured-data'
				type='application/ld+json'
				strategy='afterInteractive'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Service',
						name: 'Export & Parcel Forwarding Pricing',
						description:
							'Transparent and competitive pricing for export and parcel forwarding services from Poland. No hidden fees, just reliable and fair international shipping rates.',
						provider: {
							'@type': 'Organization',
							name: 'PolandExportFlow',
							url: 'https://polandexportflow.com',
						},
						serviceType: 'Parcel Forwarding & Export Logistics',
						offers: {
							'@type': 'Offer',
							url: 'https://polandexportflow.com/pricing',
							priceCurrency: 'EUR',
							priceSpecification: {
								'@type': 'PriceSpecification',
								price: 'Varies based on order size',
								priceCurrency: 'EUR',
								eligibleQuantity: {
									'@type': 'QuantitativeValue',
									value: 'Flexible pricing based on volume',
								},
							},
							availability: 'https://schema.org/InStock',
						},
					}),
				}}
			/>
		</div>
	)
}
