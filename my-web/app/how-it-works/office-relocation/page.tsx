import OfficeRelocation from '@/components/pages/HowItWorks/OfficeRelocation' // ZMIANA: Poprawny import
import Script from 'next/script'
import React from 'react'

// Metadane i JSON-LD specyficzne dla Office Relocation
export const metadata = {
    title: 'Office Relocation from Poland – International Moving Guide | PolandExportFlow',
    description:
        'Discover our step-by-step process for international office relocation from Poland. We handle expert packing, IT equipment logistics, customs, and final setup.',
    keywords: [
        'office relocation Poland',
        'business moving services Poland',
        'international office moving',
        'IT equipment logistics Poland',
        'corporate relocation Poland',
        'Poland international movers',
    ],
    alternates: {
        canonical: 'https://polandexportflow.com/how-it-works/office-relocation',
    },
    openGraph: {
        title: 'Office Relocation from Poland – Step-by-Step Guide | PolandExportFlow',
        description:
            'Learn how we manage international office moves, from consultation and packing to customs clearance and final delivery.',
        url: 'https://polandexportflow.com/how-it-works/office-relocation',
        siteName: 'PolandExportFlow',
        images: [
            {
                url: '/how-it-works-og.jpg', // Możesz zmienić na dedykowany obraz
                width: 1200,
                height: 630,
                alt: 'Step-by-Step Guide to Office Relocation from Poland',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How It Works - Office Relocation from Poland | PolandExportFlow',
        description:
            'Learn how we manage international office moves, from consultation and packing to customs clearance and final delivery.',
        images: ['/how-it-works-og.jpg'],
    },
}

// To jest strona dla podstrony /how-it-works/office-relocation
export default function OfficeRelocationPage() {
    return (
        <div>
            {/* Wywołujemy Twój komponent z linią czasu */}
            <OfficeRelocation /> 

            {/* Dane strukturalne dla tej KONKRETNEJ usługi */}
            <Script
                id='structured-data-how-it-works-or'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'How Office Relocation Works - PolandExportFlow',
                        description:
                            'Step-by-step guide on using PolandExportFlow for international office relocation from Poland.',
                        step: [
                            {
                                '@type': 'HowToStep',
                                name: 'Step 1: Consultation & Planning',
                                text: 'We start with a detailed consultation to understand your inventory, sensitive equipment, and timeline.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 2: Professional Packing & Inventory',
                                text: 'Our team professionally packs all office furniture, IT equipment, and documents, creating a detailed inventory.',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 3: Customs & Freight Shipping',
                                text: 'We handle all export/import documentation and utilize dedicated freight options (air, sea, or land).',
                            },
                            {
                                '@type': 'HowToStep',
                                name: 'Step 4: Delivery & Unpacking',
                                text: 'We coordinate final delivery to your new office, including setup and removal of packing materials.',
                            },
                        ],
                    }),
                }}
            />
        </div>
    )
}