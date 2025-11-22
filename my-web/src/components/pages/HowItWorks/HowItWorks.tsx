'use client'

import React from 'react'
import Link from 'next/link'
// ZMIANA: Zaktualizowane importy ikon
import { Truck, ShoppingCart, Archive, PackageSearch, Warehouse } from 'lucide-react'
import clsx from 'clsx'

// ZMIANA: Zaktualizowane ikony dla opcji
const SERVICE_HUB_OPTIONS = [
    { 
        id: 'parcel-forwarding', 
        title: 'Parcel Forwarding', 
        subtitle: 'Ship your own packages to us.', 
        path: '/how-it-works/parcel-forwarding',
        Icon: Truck 
    },
    { 
        id: 'assisted-purchase', 
        title: 'Assisted Purchase', 
        subtitle: 'We buy products on your behalf.', 
        path: '/how-it-works/assisted-purchase',
        Icon: ShoppingCart
    },
    { 
        id: 'office-relocation', 
        title: 'Office Relocation', 
        subtitle: 'International relocation support.', 
        path: '/how-it-works/office-relocation',
        Icon: Archive
    },
    { 
        id: 'pickup-service', 
        title: 'Pickup Service', 
        subtitle: 'Local collection from Polish suppliers.', 
        path: '/how-it-works/pickup-service',
        Icon: Warehouse 
    },
    { 
        id: 'product-inspection', 
        title: 'Product Inspection', 
        subtitle: 'Detailed quality checks and sampling.', 
        path: '/how-it-works/product-inspection',
        Icon: PackageSearch // ZMIANA: Przejęta ikona
    },
];

/* --- Komponent Wewnętrzny: Karta Usługi (Styl z Twojego przykładu) --- */
function ServiceHubCard({ title, subtitle, href, Icon }: {
    title: string;
    subtitle: string;
    href: string;
    Icon: React.ElementType;
}) {
    return (
        <Link 
            href={href}
            className={clsx(
                'relative w-full rounded-lg border-2 bg-white p-3 md:p-6 transition-colors',
                'border-middle-blue/20 hover:border-middle-blue/40' // Styl białej karty
            )}
        >
            <div className='px-6 pt-4 md:pt-6 pb-5 md:pb-8 text-center'>
                {/* Ikona w kółku */}
                <div
                    className={clsx(
                        'mx-auto mb-5 md:mb-6 inline-grid place-items-center rounded-full',
                        'h-10 w-10 md:h-14 md:w-14 shadow-sm',
                        'bg-middle-blue/10 ring-1 ring-middle-blue/15' // Styl kółka
                    )}>
                    <Icon className={clsx('h-5 w-5 md:h-6 md:w-6', 'text-middle-blue')} aria-hidden />
                </div>

                {/* Tytuł */}
                <div className='text-[16px] md:text-[18px] text-middle-blue font-heebo_medium truncate mb-3 md:mb-4'>
                    {title}
                </div>

                {/* Podtytuł (Subtitle) */}
                <div className='text-[13px] md:text-[14px] text-middle-blue/70 mt-1'>{subtitle} →</div>
            </div>
        </Link>
    );
}

/* --- Główny Komponent HowItWorks --- */
export default function HowItWorks() {
    return (
        <section className='section section-top'>
            <div className='wrapper w-full'>
                {/* ZMIANA: Uproszczony tytuł i usunięty paragraf */}
                <h2>Our Service</h2>

                {/* ZMIANA: Dwa oddzielne gridy dla layoutu 2 + 3 */}
                
                {/* Rząd 1: Dwie karty (desktop) (Zmniejszony gap) */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-10'>
                    {SERVICE_HUB_OPTIONS.slice(0, 2).map((service) => (
                        <ServiceHubCard 
                            key={service.id} 
                            title={service.title}
                            subtitle={service.subtitle}
                            href={service.path}
                            Icon={service.Icon}
                        />
                    ))}
                </div>

                {/* Rząd 2: Trzy karty (desktop) (Zmniejszony gap i margines) */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4'>
                    {SERVICE_HUB_OPTIONS.slice(2, 5).map((service) => (
                        <ServiceHubCard 
                            key={service.id} 
                            title={service.title}
                            subtitle={service.subtitle}
                            href={service.path}
                            Icon={service.Icon}
                        />
                    ))}
                </div>
                
            </div>
        </section>
    )
}