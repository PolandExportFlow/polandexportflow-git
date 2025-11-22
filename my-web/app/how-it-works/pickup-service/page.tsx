import PickupService from '@/components/pages/HowItWorks/PickupService'
import Script from 'next/script'
import React from 'react'

// Metadane i JSON-LD specyficzne dla Pickup Service
export const metadata = {
    title: 'How Our Pickup Service Works from Poland | PolandExportFlow',
    description:
        'Learn how our Pickup Service works. We collect packages, pallets, or goods from any supplier, marketplace (like Allegro/OLX), or seller in Poland and deliver them to our warehouse for you.',
    keywords: [
        'pickup service Poland',
        'collect from seller Poland',
        'Allegro pickup service',
        'OLX pickup service',
        'Poland warehouse collection',
        'courier pickup Poland',
    ],
    alternates: {
        canonical: 'https://polandexportflow.com/how-it-works/pickup-service',
    },
    openGraph: {
        title: 'How Our Pickup Service Works | PolandExportFlow',
        description:
            'Our step-by-step guide for local pickup. We collect from any Polish address and prepare your goods for international forwarding.',
        url: 'https://polandexportflow.com/how-it-works/pickup-service',
        siteName: 'PolandExportFlow',
        images: [
            {
                url: '/how-it-works-og.jpg', // Możesz zmienić na dedykowany obraz
                width: 1200,
                height: 630,
                alt: 'Step-by-Step Guide to Pickup Service from Poland',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How It Works - Pickup Service from Poland | PolandExportFlow',
        description:
            'Our step-by-step guide for local pickup. We collect from any Polish address and prepare your goods for international forwarding.',
        images: ['/how-it-works-og.jpg'],
    },
}

// To jest strona dla podstrony /how-it-works/pickup-service
export default function PickupServicePage() {
    return (
        <div>
            {/* Wywołujemy Twój komponent z linią czasu */}
            <PickupService /> 

            {/* Dane strukturalne dla tej KONKRETNEJ usługi */}
            <Script
                id='structured-data-how-it-works-ps'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'How Pickup Service Works - PolandExportFlow',
                        description:
                            'Step-by-step guide on using PolandExportFlow to pick up goods from a Polish seller.',
                        step: [
                            {
                                '@type': 'HowToStep',
                                name: 'Step 1: Schedule Your Pickup',
                                text: 'Provide the supplier\'s address, contact details, and desired pickup date.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 2: We Collect & Transport',
                                text: 'Our dedicated driver or a partner courier collects the goods from the seller on your behalf.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 3: Warehouse Processing & Inspection',
                                text: 'Your items arrive at our warehouse, are inspected, photographed, and securely stored.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 4: Consolidation & International Forwarding',
                                text: 'Your items are added to your account, ready to be consolidated and shipped worldwide.',
                            },
                        ],
                    }),
                }}
            />
        </div>
    )
}