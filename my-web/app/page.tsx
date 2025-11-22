import BrandsBar from '@/components/common/CarriersBrandsBar'
import Contact from '@/components/common/Contact'
import FAQ from '@/components/common/FaqSection'
import Header from '@/components/layout/Header'
import Testimonials from '@/components/common/Testimonials'
import Script from 'next/script'
import WhyChooseUs from '@/components/common/WhyChooseUs'
import React from 'react'

// ZOPTYMALIZOWANE METADANE: Nadpisujemy tylko unikalne wartości dla landing page'a.
export const metadata = {
    // 1. TYTUŁ I OPIS: Nadpisanie globalnych wartości (kluczowe dla SEO)
    title: 'Poland Parcel Forwarding & Export – Buy Polish Products Worldwide', 
    description:
        'Poland parcel forwarding, mail forwarding, product inspection, and international shipping. Buy Polish products at wholesale prices and ship worldwide – fast, safe, and hassle-free.',
    
    // 2. KEYWORDS: Słowa kluczowe specyficzne dla strony głównej
    keywords: [
        'how to ship from Poland',
        'best parcel forwarding Poland',
        'cheapest parcel forwarding Poland',
        'order from Poland and ship abroad',
        'easy shipping from Poland',
        'trusted Poland parcel forwarding',
        'global parcel forwarding Poland',
        'shop Polish stores and ship worldwide',
        'fast shipping from Poland',
        'Poland forwarding service reviews',
    ],
    
    // 3. SEO/ALTERNATES: Nadpisanie canonical URL, reszta dziedziczona z RootLayout
    alternates: {
        canonical: 'https://polandexportflow.com/',
    },
    
    // 4. OPEN GRAPH / TWITTER: Nadpisanie tytułów i opisów udostępniania
    openGraph: {
        title: 'Ship & Export from Poland – Fast & Reliable Service',
        description: 'Easily buy, inspect, and ship products from Poland. Secure forwarding & global delivery.',
    },
    twitter: {
        title: 'Buy & Ship from Poland with Confidence',
        description: 'Fast and secure Poland parcel forwarding. Order, inspect, and ship worldwide!',
    },
}

export default function Home() {
    // KLUCZOWE: Upewnij się, że ten blok zawiera prawdziwe dane firmowe!
    const jsonLdData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "PolandExportFlow (PEF)",
        "legalName": "TWÓJ RZECZYWISTY NADAWCA PRAWNY SP. Z O.O.",
        "url": "https://polandexportflow.com",
        "logo": "https://polandexportflow.com/logo.png",
        
        // DANE PRAWNE I ZAUFANIE (Trustworthiness)
        "vatID": "PL TWÓJ NIP/VAT ID", 
        "duns": "TWÓJ REGON", // Użyj REGON lub KRS
        
        "description": "We help businesses worldwide import quality goods from Poland. Secure parcel forwarding, product inspection, and wholesale shipping.",
        
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "TWÓJ RZECZYWISTY ADRES I NUMER",
            "addressLocality": "Twoje Miasto",
            "postalCode": "XX-XXX",
            "addressCountry": "PL"
        },
        
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+48 XXX XXX XXX",
            "email": "contact@polandexportflow.com",
            "contactType": "customer service",
            "areaServed": "Worldwide"
        },
        
        "sameAs": [
            "https://www.facebook.com/polandexportflow",
            "https://www.instagram.com/polandexportflow",
            "https://www.linkedin.com/company/polandexportflow"
        ]
    };

    return (
        <>
            <Header />
            <BrandsBar />
            <WhyChooseUs />
            <Testimonials />
            <Contact />
            <FAQ />

            <Script
                id='home-structured-data'
                type='application/ld+json'
                strategy='afterInteractive'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLdData),
                }}
            />
        </>
    )
}