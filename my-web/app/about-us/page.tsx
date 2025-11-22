import AboutUs from '@/components/pages/AboutUs'
import Script from 'next/script'

export const metadata = {
	title: 'About Us - Experts in Global Export & Parcel Forwarding | PolandExportFlow',
	description:
		'Learn about PolandExportFlow—your trusted partner in global shipping, export services, and parcel forwarding from Poland. Reliable, transparent, and customer-focused.',
	keywords: [
		'Poland export company',
		'parcel forwarding experts',
		'global shipping Poland',
		'Poland logistics specialists',
		'international trade solutions',
		'export services Poland',
		'worldwide freight forwarding',
	],
	alternates: {
		canonical: 'https://polandexportflow.com/about-us',
	},
	openGraph: {
		title: 'About Us - Experts in Global Export & Parcel Forwarding | PolandExportFlow',
		description:
			'Learn about PolandExportFlow—your trusted partner in global shipping, export services, and parcel forwarding from Poland. Reliable, transparent, and customer-focused.',
		url: 'https://polandexportflow.com/about-us',
		siteName: 'PolandExportFlow',
		images: [
			{
				url: '/about-us-og.jpg',
				width: 1200,
				height: 630,
				alt: 'Meet the PolandExportFlow Team',
			},
		],
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'About Us - Experts in Global Export & Parcel Forwarding | PolandExportFlow',
		description:
			'Learn about PolandExportFlow—your trusted partner in global shipping, export services, and parcel forwarding from Poland. Reliable, transparent, and customer-focused.',
		images: ['/about-us-og.jpg'],
	},
}

export default function AboutUsPage() {
	return (
		<div>
			<AboutUs />

			{/* Structured Data Schema.org */}
			<Script
				id='about-us-structured-data'
				type='application/ld+json'
				strategy='afterInteractive'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Organization',
						name: 'PolandExportFlow',
						description:
							'PolandExportFlow specializes in international shipping, export logistics, and parcel forwarding from Poland. We ensure secure and efficient global deliveries.',
						url: 'https://polandexportflow.com',
						logo: 'https://polandexportflow.com/logo.png',
						foundingDate: '2024',
						founders: [
							{
								'@type': 'Person',
								name: 'Your Name',
							},
						],
						contactPoint: [
							{
								'@type': 'ContactPoint',
								telephone: '+48 123 456 789',
								contactType: 'customer service',
								areaServed: 'Worldwide',
								availableLanguage: ['English', 'Polish'],
							},
						],
						sameAs: [
							'https://www.facebook.com/polandexportflow',
							'https://www.instagram.com/polandexportflow',
							'https://www.linkedin.com/company/polandexportflow',
						],
					}),
				}}
			/>
		</div>
	)
}
