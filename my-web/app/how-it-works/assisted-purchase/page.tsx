import AssistedPurchase from '@/components/pages/HowItWorks/AssistedPurchase' // ZMIANA: Poprawny import
import Script from 'next/script'
import React from 'react'

// Metadane i JSON-LD specyficzne dla Assisted Purchase
export const metadata = {
    title: 'How Assisted Purchase from Poland Works | PolandExportFlow',
    description:
        'Let us buy for you. Our Assisted Purchase service handles procurement, payment, and shipping from any Polish store. Learn how it works step-by-step.',
    keywords: [
        'assisted purchase Poland',
        'we buy for you Poland',
        'personal shopper Poland',
        'how to buy from Poland',
        'Polish store proxy',
        'buy from Allegro ship worldwide',
    ],
    alternates: {
        canonical: 'https://polandexportflow.com/how-it-works/assisted-purchase',
    },
    openGraph: {
        title: 'How Assisted Purchase from Poland Works | PolandExportFlow',
        description:
            'Our step-by-step guide to Assisted Purchase. We buy, inspect, consolidate, and ship products from Poland to your doorstep.',
        url: 'https://polandexportflow.com/how-it-works/assisted-purchase',
        siteName: 'PolandExportFlow',
        images: [
            {
                url: '/how-it-works-og.jpg', // Możesz zmienić na dedykowany obraz
                width: 1200,
                height: 630,
                alt: 'Step-by-Step Guide to Assisted Purchase from Poland',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How It Works - Assisted Purchase from Poland | PolandExportFlow',
        description:
            'Our step-by-step guide to Assisted Purchase. We buy, inspect, consolidate, and ship products from Poland to your doorstep.',
        images: ['/how-it-works-og.jpg'],
    },
}

// To jest strona dla podstrony /how-it-works/assisted-purchase
export default function AssistedPurchasePage() {
    return (
        <div>
            {/* Wywołujemy komponent z linią czasu dla Assisted Purchase */}
            <AssistedPurchase /> 

            {/* Dane strukturalne dla tej KONKRETNEJ usługi */}
            <Script
                id='structured-data-how-it-works-ap'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'How Assisted Purchase Works - PolandExportFlow',
                        description:
                            'Step-by-step guide on using PolandExportFlow Assisted Purchase to buy and ship products from Poland.',
                        step: [
                            {
                                '@type': 'HowToStep',
                                name: 'Step 1: Send Us Your Shopping List',
                                text: 'Provide links or descriptions of the products you want us to buy from Polish stores.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 2: We Purchase & Confirm',
                                text: 'We purchase the items on your behalf and confirm the order details with you.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 3: Shipment Preparation & Consolidation',
                                text: 'Your items arrive at our warehouse, are inspected, photographed, and securely repackaged (consolidated if needed).',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 4: Final Payment & Shipping',
                                text: 'You pay the final invoice (including shipping) and we dispatch the package with full tracking.',
                            },
                        ],
                    }),
                }}
            />
        </div>
    )
}