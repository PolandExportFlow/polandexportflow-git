// app/faq/page.tsx
import FAQ from '@/components/pages/Faq' // Upewnij się, że ścieżka jest poprawna
import Script from 'next/script'

export const metadata = {
    title: 'Frequently Asked Questions (FAQ) | PolandExportFlow',
    description:
        'Find answers to common questions about our export, logistics, and parcel forwarding services from Poland. Learn about shipping, payments, and private orders.',
    keywords: [
        'Poland export FAQ',
        'parcel forwarding questions',
        'logistics FAQ',
        'shipping from Poland questions',
        'Poland wholesale FAQ',
        'private orders from Poland',
    ],
    alternates: {
        canonical: 'https://polandexportflow.com/faq',
    },
    openGraph: {
        title: 'Frequently Asked Questions (FAQ) | PolandExportFlow',
        description:
            'Find answers to common questions about our export, logistics, and parcel forwarding services from Poland.',
        url: 'https://polandexportflow.com/faq',
        images: [
            {
                url: '/faq-og.jpg', // Pamiętaj, aby utworzyć ten obrazek
                width: 1200,
                height: 630,
                alt: 'Frequently Asked Questions about PolandExportFlow',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Frequently Asked Questions (FAQ) | PolandExportFlow',
        description:
            'Find answers to common questions about our export, logistics, and parcel forwarding services from Poland.',
        images: ['/faq-og.jpg'], // Pamiętaj, aby utworzyć ten obrazek
    },
}

// Dane do JSON-LD (ręcznie zmapowane z Twojego komponentu dla SEO)
const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        // Private Orders
        {
            '@type': 'Question',
            name: 'Do you ship individual private packages?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, absolutely! We can send private parcels worldwide.',
            },
        },
        {
            '@type': 'Question',
            name: 'How long does order fulfillment take?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'It depends on the product and shipping method. Standard time: 3–7 days.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can I order samples?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! We can provide samples upon request. Pricing depends on the product and shipping costs.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can you find products not listed on marketplaces?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! If you can’t find a product, let us know — we’ll source it for you.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can I request repackaging to reduce shipping costs?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! We offer a repackaging service to optimize the size and weight of your shipment, helping you save on international shipping costs. If an item has excessive packaging, we can remove or consolidate it while ensuring proper protection. Just let us know your preferences when placing an order.',
            },
        },
        // Business & Logistics
        {
            '@type': 'Question',
            name: 'Which shipping methods do you offer?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'InPost International, UPS Standard/Express Saver, DHL Express.',
            },
        },
        {
            '@type': 'Question',
            name: 'What payment methods do you accept?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'PayPal, Wise, Revolut, ZEN.',
            },
        },
        {
            '@type': 'Question',
            name: 'Do you guarantee that all documents meet my country’s import regulations?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'No, the client is responsible for verifying the requirements with local authorities.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can you provide additional certificates if required?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! We can provide additional certificates if required. Please contact us in advance, as processing times and additional fees may apply.',
            },
        },
        {
            '@type': 'Question',
            name: 'Since when have you been in business?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'We have been operating since 2025, backed by industry experience and strong supplier relationships.',
            },
        },
    ],
}


export default function FaqPage() {
    return (
        <div>
            <FAQ />
            
            {/* Dane strukturalne Schema.org */}
            <Script
                id='faq-structured-data'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData),
                }}
            />
        </div>
    )
}