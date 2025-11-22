import ParcelForwarding from '@/components/pages/HowItWorks/ParcelForwarding'
import Script from 'next/script'
import React from 'react'

// Metadane i JSON-LD specyficzne dla Parcel Forwarding
export const metadata = {
    title: 'How Parcel Forwarding from Poland Works – Step-by-Step Guide | PolandExportFlow',
    description:
        'Discover how Poland parcel forwarding works with our simple step-by-step process. From ordering and product inspection to secure packaging and international delivery – import from Poland made easy.',
    keywords: [
        'how parcel forwarding works',
        'parcel forwarding from Poland',
        'Poland parcel forwarding guide',
        'import from Poland step-by-step',
        'Polish products international shipping',
        'parcel forwarding process Poland',
        'buy from Poland and ship worldwide',
        'customs clearance Poland',
    ],
    alternates: {
        canonical: 'https://polandexportflow.com/how-it-works/parcel-forwarding',
    },
    openGraph: {
        title: 'How Parcel Forwarding from Poland Works – Step-by-Step Guide | PolandExportFlow',
        description:
            'Step-by-step guide on how to import from Poland with PolandExportFlow. Learn about order placement, product inspection, secure packaging, and global shipping.',
        url: 'https://polandexportflow.com/how-it-works/parcel-forwarding',
        siteName: 'PolandExportFlow',
        images: [
            {
                url: '/how-it-works-og.jpg',
                width: 1200,
                height: 630,
                alt: 'Step-by-Step Guide to Export from Poland',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How It Works - Easy Parcel Forwarding & Export from Poland | PolandExportFlow',
        description:
            'Step-by-step guide on how to import from Poland with PolandExportFlow. Learn about order placement, product inspection, secure packaging, and global shipping.',
        images: ['/how-it-works-og.jpg'],
    },
}

// To jest strona dla podstrony /how-it-works/parcel-forwarding
export default function ParcelForwardingPage() {
    return (
        <div>
            {/* Wywołujemy Twój komponent z linią czasu */}
            <ParcelForwarding /> 

            {/* Dane strukturalne dla tej KONKRETNEJ usługi */}
            <Script
                id='structured-data-how-it-works-pf'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'How Parcel Forwarding Works - PolandExportFlow',
                        description:
                            'Step-by-step guide on using PolandExportFlow for seamless international shipping and parcel forwarding from Poland.',
                        step: [
                            {
                                '@type': 'HowToStep',
                                name: 'Step 1: Submit Your Order',
                                text: 'Select your desired products from Poland and submit an inquiry for processing.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 2: Order Process & Payment',
                                text: 'We confirm details and provide payment options.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 3: Shipment Preparation',
                                text: 'Your order is inspected, photographed, and securely repackaged.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 4: Final Shipment & Tracking',
                                text: 'We assist with customs and provide tracking for final delivery.',
                            },
                        ],
                    }),
                }}
            />
        </div>
    )
}