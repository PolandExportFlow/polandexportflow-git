import '../src/styles/globals.css'
import MyScripts from '@/components/Scripts'
import ClientLayout from './layout.client'
import React from 'react'

// ZMIANA 1: USUNIĘCIE themeColor z obiektu metadata
export const metadata = {
    // 1. PODSTAWOWE DANE I KANONICZNE URL
    metadataBase: new URL('https://polandexportflow.com'),
    alternates: {
        canonical: 'https://polandexportflow.com',
    },
    
    // 2. TYTUŁY I OPISY
    title: {
        default: 'Parcel Forwarding, Assisted Purchase & Export Services from Poland',
        template: '%s | PolandExportFlow',
    },
    description:
        'Secure parcel forwarding, product inspection, and global shipping. We handle purchases, consolidation, and worldwide delivery from Poland, hassle-free.',
    
    // 3. IKONY
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/favicon.svg', type: 'image/svg+xml' },
        ],
        apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
    },
    
    // 4. USTAWIENIA DLA ROBOTÓW
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1', 
    
    // 5. OPEN GRAPH
    openGraph: {
        url: 'https://polandexportflow.com',
        siteName: 'PolandExportFlow',
        images: [
            {
                url: '/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'PolandExportFlow Global Export & Logistics',
            },
        ],
        type: 'website',
    },
    
    // 6. TWITTER
    twitter: {
        card: 'summary_large_image',
        images: ['/og-image.jpg'],
    },
}

// ZMIANA 2: WYEKSPORTOWANIE themeColor w osobnym obiekcie viewport
export const viewport = {
    themeColor: '#05213C',
    // Dodajemy podstawową konfigurację viewportu dla pełnego profesjonalizmu
    width: 'device-width',
    initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <head>
                <MyScripts />
                <link rel='manifest' href='/manifest.json' />
            </head>
            <body>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    )
}