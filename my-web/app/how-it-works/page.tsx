import HowItWorks from '@/components/pages/HowItWorks/HowItWorks'
import React from 'react'
import Script from 'next/script'

// Metadane dla strony indeksu usług (Service Hub)
export const metadata = {
	title: 'All Services & Guides – How We Work | PolandExportFlow',
	description:
		'Explore our full suite of services: Parcel Forwarding, Assisted Purchase, Relocation, and Inspection. Find a detailed guide for every export scenario.',
	keywords: ['full service catalog', 'export service hub', 'how it works index', 'all Poland export services'],
	alternates: {
		canonical: 'https://polandexportflow.com/how-it-works',
	},
	openGraph: {
		title: 'PolandExportFlow Service Index',
		description: 'Find guides for Parcel Forwarding, Assisted Purchase, and more.',
		url: 'https://polandexportflow.com/how-it-works',
		images: [{ url: '/how-it-works-og.jpg', width: 1200, height: 630, alt: 'Service Index' }],
	},
	twitter: {
		title: 'Service Catalog & Guides',
		description: 'Explore all available export and forwarding services.',
	},
}

// Ten plik renderuje stronę /how-it-works
export default function HowItWorksPage() {
	return (
		<div>
			<HowItWorks />
		</div>
	)
}
