import React from 'react'
import { UniversalDetail } from '@/components/ui/UniversalDetail' 
import {
    Flame,
    Sword,
    FlaskConical, 
    Sprout,
    Landmark, 
    ShieldAlert,
    BatteryCharging,
} from 'lucide-react'

// === Rzeczy absolutnie zakazane ===
const prohibitedItems: ProhibitedCategory[] = [
    {
        title: 'Weapons, Explosives & Ammunition',
        icon: <Sword className='w-5 h-5 text-middle-blue' />, 
        items: [
            'Firearms and firearm parts, including toys resembling firearms',
            'Ammunition (live or inert)',
            'Fireworks, flares, and sparklers',
            'Explosives and gunpowder',
            'Tasers and pepper spray',
        ],
    },
    {
        title: 'Illegal Substances & Drugs',
        icon: <FlaskConical className='w-5 h-5 text-middle-blue' />, 
        items: [
            'Narcotics and illegal drugs',
            'Psychoactive substances and legal highs',
            'Unprescribed medication',
            'CBD/THC products, e-cigarettes, and vapes',
            'Tobacco and nicotine products (sticks for IQOS, etc.)',
        ],
    },
    {
        title: 'Financial & Counterfeit',
        icon: <Landmark className='w-5 h-5 text-middle-blue' />,
        items: [
            'Cash/currency',
            'Precious metals (bullion)',
            'Loose precious stones',
            'Counterfeit goods, currency, and stamps',
            'Lottery tickets',
            'Credit/Debit cards',
        ],
    },
    {
        title: 'Other Prohibited Goods',
        icon: <ShieldAlert className='w-5 h-5 text-middle-blue' />,
        items: [
            'Pornographic materials',
            'Live animals and insects',
            'Human remains, ashes',
            'Magnets',
            'Standalone/loose lithium-ion batteries (e.g., power banks)',
        ],
    },
]

// === Rzeczy, które wysyłasz na specjalnych warunkach ===
const restrictedItems: ProhibitedCategory[] = [
    {
        title: 'Flammable Liquids',
        icon: <Flame className='w-5 h-5 text-middle-blue' />, 
        items: [
            'Perfumes and colognes (containing alcohol)',
            'Nail polish',
            'Aerosol cans (hairspray, deodorant)',
            'Hand sanitizers',
            'Flammable paints and varnishes',
        ],
    },
    {
        title: 'Batteries',
        icon: <BatteryCharging className='w-5 h-5 text-middle-blue' />,
        items: [
            'Lithium-ion batteries *installed inside* a device (e.g., laptop, phone, watch)',
            'Lithium-ion batteries *packed with* a device (e.g., camera with a spare battery)',
            'These items require special courier handling (Dangerous Goods) and may incur surcharges.',
        ],
    },
    {
        title: 'Food, Plants & Other',
        icon: <Sprout className='w-5 h-5 text-middle-blue' />,
        items: [
            'Food products (must be non-perishable and in original sealed packaging)',
            'Alcoholic beverages (subject to country-specific laws and courier restrictions)',
            'Plants and seeds (may require phytosanitary certificates)',
            'Jewelry and watches (limited insurance coverage)',
        ],
    },
]

interface ProhibitedCategory {
    title: string
    icon: React.ReactNode
    items: string[]
}

export default function ProhibitedItems() {
    return (
        <section className='section section-top'>
            <div className='wrapper w-full'>
                <h2>Prohibited & Restricted Items</h2>
                <p className='mt-4 mb-8 text-middle-blue/80 max-w-2xl'>
                    Below is a general list of Prohibited (cannot be shipped) and Restricted (special conditions apply) items.
                    This list is not exhaustive, and regulations vary by country. It is the client's responsibility to ensure items
                    comply with all laws.
                </p>
                <h4 className="mb-4 md:mb-5 text-[12px] md:text-[14px] font-made_regular text-middle-blue">Prohibited Items (Cannot Be Shipped)</h4>
                <div className='flex flex-col gap-3'>
                    {prohibitedItems.map(category => (
                        <UniversalDetail
                            key={category.title}
                            title={category.title}
                            icon={category.icon}
                            collapsible={true}
                            defaultOpen={false}
                            defaultOpenMobile={false}
                            className='border-middle-blue/10'
                        >
                            <ul className='list-disc list-inside ml-4 text-middle-blue/90 space-y-1 pt-2'>
                                {category.items.map(item => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </UniversalDetail>
                    ))}
                </div>
                <h4 className="mt-12 mb-4 md:mb-5 text-[12px] md:text-[14px] font-made_regular text-middle-blue">Restricted Items (Special Conditions Apply)</h4>
                <div className='flex flex-col gap-3'>
                    {restrictedItems.map(category => (
                        <UniversalDetail
                            key={category.title}
                            title={category.title}
                            icon={category.icon}
                            collapsible={true}
                            defaultOpen={false}
                            defaultOpenMobile={false}
                            className='border-middle-blue/10'
                        >
                            <ul className='list-disc list-inside ml-4 text-middle-blue/90 space-y-1 pt-2'>
                                {category.items.map(item => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </UniversalDetail>
                    ))}
                </div>

            </div>
        </section>
    )
}