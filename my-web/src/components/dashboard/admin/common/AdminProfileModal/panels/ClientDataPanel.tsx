'use client'

import React from 'react'
import { User, Mail, Phone, BadgeCheck, CalendarDays, Hash } from 'lucide-react'
import type { AdminProfile } from '../AdminProfileTypes'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'

type Props = {
    profile: AdminProfile
    onEditField?: (field: 'name' | 'email' | 'phone' | 'accountType', current?: string) => void
}

export default function ClientDataPanel({ profile, onEditField }: Props) {
    const dateStr = (d?: string | Date) =>
        d
            ? new Date(d).toLocaleString('pl-PL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
              })
            : '—'

    const withCopy = (extra?: { label: string; onClick?: () => void }[]) =>
        [{ kind: 'copy', label: 'Kopiuj' } as const].concat(
            (extra ?? []).map(e => ({ kind: 'custom', label: e.label, onClick: e.onClick } as any))
        )

    return (
        <UniversalDetail 
            title='Dane klienta' 
            icon={<User className='h-5 w-5' />} 
            className='bg-white border-light-blue'
            defaultOpen // ZAWSZE OTWARTE DOMYŚLNIE
            collapsible={false} // WYŁĄCZENIE ZWIJANIA
        >
            
            {/* KOD KLIENTA (Biznesowy ID) */}
            <DetailRow
                icon={<Hash className='w-3.5 h-3.5' />}
                label='Kod klienta'
                value={profile.user_code || '—'}
                valueText={profile.user_code}
                strongValue
                actions={withCopy()}
            />

            {/* Imię i nazwisko (DANE KONTA) */}
            <DetailRow
                icon={<User className='w-3.5 h-3.5' />}
                label='Imię i nazwisko'
                value={profile.full_name || '—'}
                valueText={profile.full_name}
                strongValue
                actions={withCopy(
                    onEditField ? [{ label: 'Edytuj', onClick: () => onEditField('name', profile.full_name) }] : undefined
                )}
            />
            {/* E-mail (DANE KONTA) */}
            <DetailRow
                icon={<Mail className='w-3.5 h-3.5' />}
                label='E-mail'
                value={profile.email || '—'}
                valueText={profile.email}
                actions={withCopy(
                    onEditField ? [{ label: 'Edytuj', onClick: () => onEditField('email', profile.email) }] : undefined
                )}
            />
            {/* Telefon (DANE KONTA) */}
            <DetailRow
                icon={<Phone className='w-3.5 h-3.5' />}
                label='Telefon'
                value={profile.phone || '—'}
                valueText={profile.phone}
                actions={withCopy(
                    onEditField ? [{ label: 'Edytuj', onClick: () => onEditField('phone', profile.phone) }] : undefined
                )}
            />
            {/* Typ konta */}
            <DetailRow
                icon={<BadgeCheck className='w-3.5 h-3.5' />}
                label='Typ konta'
                value={profile.account_type || '—'}
                valueText={profile.account_type}
                actions={withCopy(
                    onEditField
                        ? [{ label: 'Edytuj', onClick: () => onEditField('accountType', profile.account_type) }]
                        : undefined
                )}
            />

            {/* ID SB (Techniczne) */}
            <DetailRow
                icon={<Hash className='w-3.5 h-3.5 opacity-60' />}
                label='ID SB'
                value={<span className='opacity-60'>{profile.id || '—'}</span>}
                valueText={profile.id}
                actions={withCopy()}
            />

            {/* Utworzone */}
            <DetailRow
                icon={<CalendarDays className='w-3.5 h-3.5' />}
                label='Utworzone'
                value={dateStr(profile.created_at)}
            />
        </UniversalDetail>
    )
}