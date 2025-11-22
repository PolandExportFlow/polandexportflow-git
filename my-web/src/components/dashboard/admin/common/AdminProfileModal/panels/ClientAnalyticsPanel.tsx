'use client'

import React, { useMemo } from 'react'
import { BarChart3, CalendarDays, ShoppingBag, DollarSign } from 'lucide-react'
// ZMIANA 1: Importujemy ClientAnalytics
import type { AdminProfile, ClientAnalytics } from '../AdminProfileTypes' 
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'

type Props = { profile: AdminProfile }

export default function ClientAnalyticsPanel({ profile }: Props) {
    // ZMIANA 2: Używamy rzutowania typu 'as ClientAnalytics'
    const a = (profile.analytics ?? {}) as ClientAnalytics 

    const fmtPLN = (n?: number) =>
        typeof n === 'number'
            ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(n)
            : '—'
    const dateStr = (d?: string | Date) =>
        d ? new Date(d).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'

    return (
        <UniversalDetail
            title='Analityka klienta'
            icon={<BarChart3 className='h-5 w-5' />}
            className='bg-white border-light-blue'
            defaultOpen 
            collapsible={false} 
        >
            
            <DetailRow
                icon={<CalendarDays className='w-3.5 h-3.5' />}
                label='Pierwsze zamówienie'
                value={dateStr(a.first_order_at)}
            />
            <DetailRow
                icon={<CalendarDays className='w-3.5 h-3.5' />}
                label='Ostatnie zamówienie'
                value={dateStr(a.last_order_at)}
            />
            <DetailRow icon={<ShoppingBag className='w-3.5 h-3.5' />} label='Liczba zamówień' value={a.orders_count ?? '—'} />
            
            <DetailRow
                icon={<DollarSign className='w-3.5 h-3.5' />}
                label='Lifetime Value (Zysk)'
                value={fmtPLN(a.lifetime_value_pln)}
            />
            
            <DetailRow
                icon={<DollarSign className='w-3.5 h-3.5' />}
                label='Średnia wartość (Zysk)'
                value={fmtPLN(a.avg_order_value_pln)}
            />
        </UniversalDetail>
    )
}