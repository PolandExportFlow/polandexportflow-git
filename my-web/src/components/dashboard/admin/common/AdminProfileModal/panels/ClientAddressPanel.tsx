'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { MapPin, Copy, Mail, User, Phone, Check } from 'lucide-react'
import type { AdminProfile, Address } from '../AdminProfileTypes'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import Flag from '@/components/common/Flag'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

type Props = {
	profile: AdminProfile
	onCopyCourier?: () => void
	composeCourierAddress?: () => string
}

function dedupe(arr: Address[]): Address[] {
	const seen = new Set<string>()
	const out: Address[] = []
	for (const a of arr) {
		const key = JSON.stringify({
			country: (a.default_country || '').trim().toLowerCase(),
			city: (a.default_city || '').trim().toLowerCase(),
			postalCode: (a.default_postal || '').trim(),
			street: (a.default_street || '').trim().toLowerCase(),
			buildingNo: (a.default_apartment || '').trim().toLowerCase(),
			email: (a.default_email || '').trim().toLowerCase(),
			phone: (a.default_phone || '').trim(),
		})
		if (!seen.has(key)) {
			seen.add(key)
			out.push(a)
		}
	}
	return out
}

export default function ClientAddressPanel({ profile, onCopyCourier, composeCourierAddress }: Props) {
	const [copied, setCopied] = useState(false)
	const addr = profile.address || ({} as Address)

	const contactName = addr.default_full_name
	const contactEmail = addr.default_email
	const contactPhone = addr.default_phone

	const countryInfo = useMemo(() => getCountryInfoByName(addr?.default_country), [addr?.default_country])
	const countryIsoCode = countryInfo?.code ?? null
	const countryLabel = countryInfo?.label ?? addr?.default_country

	const copy = useCallback(async () => {
		const contactBlock = [(contactName || '').trim(), (contactEmail || '').trim(), (contactPhone || '').trim()]
			.filter(Boolean)
			.join('\n')

		const addressBlock = [
			(addr?.default_country || '').trim(),
			(addr?.default_city || '').trim(),
			(addr?.default_postal || '').trim(),
			[addr?.default_street, addr?.default_apartment].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
		]
			.filter(Boolean)
			.join('\n')

		const txt = composeCourierAddress
			? composeCourierAddress()
			: [contactBlock, addressBlock].filter(Boolean).join('\n\n')

		try {
			await navigator.clipboard.writeText(txt)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {}
	}, [addr, contactName, contactEmail, contactPhone, composeCourierAddress])

	const CopyIcon = copied ? Check : Copy
	const buttonText = copied ? 'Skopiowano!' : 'Kopiuj adres'

	return (
		<UniversalDetail
			title='Dane adresowe'
			icon={<MapPin className='h-5 w-5' />}
			className='bg-white border-light-blue'
			defaultOpen
			collapsible={false}
			headerExtra={
				<button
					type='button'
					onClick={copy}
					className='inline-flex items-center gap-2 rounded-md border border-middle-blue/8 bg-light-blue/60 px-4 py-2.5 text-[12px] transition-colors duration-200 hover:bg-middle-blue/0'
					title='Kopiuj adres'>
					<CopyIcon className='h-3.5 w-3.5' />
					{buttonText}
				</button>
			}>
			<DetailRow
				icon={<User className='w-3.5 h-3.5' />}
				label='Imię i nazwisko (Kontakt)'
				value={contactName || '—'}
				valueText={contactName}
			/>
			<DetailRow
				icon={<Mail className='w-3.5 h-3.5' />}
				label='E-mail (Kontakt)'
				value={contactEmail || '—'}
				valueText={contactEmail}
			/>
			<DetailRow
				icon={<Phone className='w-3.5 h-3.5' />}
				label='Telefon (Kontakt)'
				value={contactPhone || '—'}
				valueText={contactPhone}
			/>

			<DetailRow
				icon={<MapPin className='w-3.5 h-3.5' />}
				label='Kraj'
				value={
					addr?.default_country ? (
						<span className='inline-flex items-center gap-2'>
							{countryIsoCode && <Flag iso={countryIsoCode} />}
							<span>{countryLabel}</span>
						</span>
					) : (
						'—'
					)
				}
				valueText={addr?.default_country}
			/>
			<DetailRow
				icon={<MapPin className='w-3.5 h-3.5' />}
				label='Miasto'
				value={addr?.default_city || '—'}
				valueText={addr?.default_city}
			/>
			<DetailRow
				icon={<MapPin className='w-3.5 h-3.5' />}
				label='Kod pocztowy'
				value={addr?.default_postal || '—'}
				valueText={addr?.default_postal}
			/>
			<DetailRow
				icon={<MapPin className='w-3.5 h-3.5' />}
				label='Ulica'
				value={addr?.default_street || '—'}
				valueText={addr?.default_street}
			/>
			{addr?.default_apartment ? (
				<DetailRow
					icon={<MapPin className='w-3.5 h-3.5' />}
					label='Nr budynku'
					value={addr?.default_apartment}
					valueText={addr?.default_apartment}
				/>
			) : null}
		</UniversalDetail>
	)
}
