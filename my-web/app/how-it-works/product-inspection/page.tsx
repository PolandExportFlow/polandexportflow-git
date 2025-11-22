import ProductInspection from '@/components/pages/HowItWorks/ProductInspection'
import Script from 'next/script'
import React from 'react'

// Metadane i JSON-LD specyficzne dla Product Inspection
export const metadata = {
    title: 'How Product Inspection Works – Quality Control Poland | PolandExportFlow',
    description:
        'Learn how our Product Inspection service works. We provide detailed photos, quality checks, functional testing, and sampling for your products in Poland before international shipping.',
    keywords: [
        'product inspection Poland',
        'quality control Poland',
        'warehouse inspection services',
        'verify products Poland',
        'product testing Poland',
        'supplier verification Poland',
    ],
    alternates: {
        canonical: 'https://polandexportflow.com/how-it-works/product-inspection',
    },
    openGraph: {
        title: 'How Product Inspection Works | PolandExportFlow',
        description:
            'Our step-by-step guide to product quality control. We check, test, and verify your goods in our Polish warehouse before you ship.',
        url: 'https://polandexportflow.com/how-it-works/product-inspection',
        siteName: 'PolandExportFlow',
        images: [
            {
                url: '/how-it-works-og.jpg', // Możesz zmienić na dedykowany obraz
                width: 1200,
                height: 630,
                alt: 'Step-by-Step Guide to Product Inspection in Poland',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How It Works - Product Inspection in Poland | PolandExportFlow',
        description:
            'Our step-by-step guide to product quality control. We check, test, and verify your goods in our Polish warehouse before you ship.',
        images: ['/how-it-works-og.jpg'],
    },
}

// To jest strona dla podstrony /how-it-works/product-inspection
export default function ProductInspectionPage() {
    return (
        <div>
            {/* Wywołujemy Twój komponent z linią czasu */}
            <ProductInspection /> 

            {/* Dane strukturalne dla tej KONKRETNEJ usługi */}
            <Script
                id='structured-data-how-it-works-pi'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'How Product Inspection Works - PolandExportFlow',
                        description:
                            'Step-by-step guide on using PolandExportFlow for product inspection and quality control in Poland.',
                        step: [
                            {
                                '@type': 'HowToStep',
                                name: 'Step 1: Define Inspection Scope',
                                text: 'You provide detailed instructions on what to check: quantity, quality, functionality, photos, or specific measurements.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 2: Item Arrival at Warehouse',
                                text: 'Your items arrive at our warehouse (from a seller, our pickup service, or an assisted purchase).',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 3: Detailed Inspection & Report',
                                text: 'We perform the requested checks, take high-resolution photos/videos, and send you a detailed report.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 4: Your Decision & Forwarding',
                                text: 'Based on the report, you decide whether to accept, return, or dispose of the items. We then forward the approved goods.',
                            },
                        ],
                    }),
                }}
            />
        </div>
    )
}