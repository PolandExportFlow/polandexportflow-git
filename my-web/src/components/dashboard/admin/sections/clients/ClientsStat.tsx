// app/.../sections/clients/ClientsStat.tsx
'use client'

import { Users2, Repeat2, ShoppingBag, Building2, Activity } from 'lucide-react'
import { UniversalStatWidget } from '../../utils/UniversalStatWidget'

type Props = {
    totalClients?: number
    returningClients?: number
    b2cClients?: number
    b2bClients?: number
    active30d?: number
}

export default function ClientsStat({
    totalClients = 0,
    returningClients = 0,
    b2cClients = 0,
    b2bClients = 0,
    active30d = 0,
}: Props) {
    const items = [
        { icon: Users2, label: 'Wszyscy klienci', value: totalClients },
        { icon: Repeat2, label: 'Powracający (>1 zam.)', value: returningClients },
        { icon: ShoppingBag, label: 'Klienci B2C', value: b2cClients },
        { icon: Building2, label: 'Klienci B2B', value: b2bClients },
        { icon: Activity, label: 'Aktywni 30 dni', value: active30d },
    ] as const

    return (
        <UniversalStatWidget
            stats={items.map(i => ({ icon: i.icon, label: i.label, value: i.value, variant: 'compact' }))}
        />
    )
}