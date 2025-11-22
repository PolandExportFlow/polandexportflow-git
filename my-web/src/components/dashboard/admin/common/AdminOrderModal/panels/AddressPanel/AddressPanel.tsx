// app/admin/components/sections/orders/panels/AddressPanel/AddressPanel.tsx
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { MapPin, FileText, Mail, Phone, Copy, MessageSquareText, Check } from 'lucide-react'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import Flag from '@/components/common/Flag'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import Tracking from './Tracking'
import { getCountryInfoByName } from '@/utils/country/countryHelper'
import { AddressBlock } from '../../AdminOrderTypes'

type CarrierInfo = { name: string; key?: string }

const EMPTY_ADDRESS: AddressBlock = {
	order_fullname: null,
	order_email: null,
	order_phone: null,
	order_country: null,
	order_city: null,
	order_postal_code: null,
	order_street: null,
	order_house_number: null,
	order_delivery_notes: null,
}

type Props = {
	/** Używamy LOOKUP (order_number) – spójnie z RPC */
	orderLookup: string
	address: AddressBlock | null
	carrier?: CarrierInfo | null
	trackingCode?: string
	quotedShippingPLN?: number | null
	onUpsertAddress: (patch: Partial<AddressBlock>) => Promise<void> | void
}

export default function AddressPanel({
	orderLookup,
	address,
	carrier,
	trackingCode,
	quotedShippingPLN,
	onUpsertAddress,
}: Props) {
	const [form, setForm] = useState<AddressBlock>(address ?? EMPTY_ADDRESS)
	const [editing, setEditing] = useState<keyof AddressBlock | null>(null)
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		setForm(address ?? EMPTY_ADDRESS)
	}, [address])

	const commitPatch = async (patch: Partial<AddressBlock>) => {
		const noChange = Object.entries(patch).every(([k, v]) => (form as any)[k] === v)
		if (noChange) {
			setEditing(null)
			return
		}
		setForm(prev => ({ ...prev, ...patch }))
		setEditing(null)
		try {
			await onUpsertAddress?.(patch)
		} catch (error) {
			console.error('Błąd zapisu adresu, przywracanie...', error)
			setForm(address ?? EMPTY_ADDRESS)
		}
	}

	const handleCommit = async (field: keyof AddressBlock, rawVal: string | null) => {
		const v = (rawVal ?? '').trim()
		await commitPatch({ [field]: v || null } as Partial<AddressBlock>)
	}

	const handleCopy = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation()
			const contactBlock = [
				(form.order_fullname || '').trim(),
				(form.order_email || '').trim(),
				(form.order_phone || '').trim(),
			]
				.filter(Boolean)
				.join('\n')
			const addressBlock = [
				(form.order_country || '').trim(),
				(form.order_city || '').trim(),
				(form.order_postal_code || '').trim(),
				[form.order_street, form.order_house_number].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
			]
				.filter(Boolean)
				.join('\n')
			const notesBlock = (form.order_delivery_notes || '').trim()
			const txt = [contactBlock, addressBlock, notesBlock].filter(Boolean).join('\n\n')
			if (!txt) return
			try {
				await navigator.clipboard.writeText(txt)
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			} catch (err) {
				console.error('Failed to copy text: ', err)
				setCopied(false)
			}
		},
		[form]
	)

	const countryInfo = useMemo(() => getCountryInfoByName(form.order_country), [form.order_country])
	const countryLabel = countryInfo?.label ?? form.order_country ?? '—'
	const countryIsoCode = countryInfo?.code ?? null

	const CopyIcon = copied ? Check : Copy
	const buttonText = copied ? 'Skopiowano!' : 'Kopiuj adres'

	// Helper do szybkiego tworzenia pól
	const renderField = (
		field: keyof AddressBlock,
		label: string,
		icon: React.ReactNode,
		displayValue?: React.ReactNode,
		className?: string // Dodajemy argument className
	) => {
		const val = form[field] ?? null
		return (
			<DetailRow
				icon={icon}
				label={label}
				className={className} // Przekazujemy className
				actions={[{ kind: 'edit', onClick: () => setEditing(field) }]}
				value={
					editing === field ? (
						<UniversalTableInput
							value={val ?? ''}
							mode='text'
							align='right'
							placeholder={label}
							widthPx={220}
							compactMobile
							autoStartEditing
							onCommit={v => {
								void handleCommit(field, (v ?? '').trim() || null)
								setEditing(null)
							}}
							onCancel={() => setEditing(null)}
						/>
					) : (
						<span className={['select-text', val ? '' : 'opacity-50'].join(' ')}>{displayValue ?? (val || '—')}</span>
					)
				}
				valueText={val ?? ''}
			/>
		)
	}

	return (
		<UniversalDetail
			title='Adres dostawy'
			icon={<MapPin className='h-5 w-5' />}
			className='bg-white border-light-blue'
			headerExtra={
				<span className='flex items-center gap-3'>
					<button
						type='button'
						onClick={handleCopy}
						className='inline-flex items-center gap-2 rounded-md border border-middle-blue/8 bg-light-blue/60 px-4 py-2.5 text-[12px] transition-colors duration-200 hover:bg-middle-blue/0'
						title='Kopiuj adres'>
						<CopyIcon className='h-3.5 w-3.5' />
						{buttonText}
					</button>
				</span>
			}>
			{/* Używamy DetailRow bezpośrednio */}
			{renderField('order_fullname', 'Imię i nazwisko', <FileText className='w-3.5 h-3.5' />)}
			{renderField('order_email', 'E-mail', <Mail className='w-3.5 h-3.5' />)}
			{renderField('order_phone', 'Telefon', <Phone className='w-3.5 h-3.5' />)}

			{/* Pole Kraju ze specjalnym wyświetlaniem */}
			{renderField(
				'order_country',
				'Kraj',
				<MapPin className='w-3.5 h-3.5' />,
				<span className='inline-flex items-center gap-2 align-middle'>
					{countryIsoCode ? <Flag iso={countryIsoCode} title={countryLabel} /> : null}
					{countryLabel}
				</span>
			)}

			{renderField('order_city', 'Miasto', <MapPin className='w-3.5 h-3.5' />)}
			{renderField('order_postal_code', 'Kod pocztowy', <MapPin className='w-3.5 h-3.5' />)}
			{renderField('order_street', 'Ulica', <MapPin className='w-3.5 h-3.5' />)}
			{renderField('order_house_number', 'Nr budynku', <MapPin className='w-3.5 h-3.5' />)}

			{/* Ostatni wiersz - PRZYWRÓCONA klasa '!border-b-0' */}
			{renderField(
				'order_delivery_notes',
				'Uwagi do dostawy',
				<MessageSquareText className='w-3.5 h-3.5' />,
				undefined,
				'!border-b-0'
			)}

			{/* Komponent Tracking renderowany jako osobny plik */}
			<Tracking
				orderLookup={orderLookup}
				carrier={carrier || undefined}
				trackingCode={trackingCode || ''}
				quotedShipping={quotedShippingPLN ?? undefined}
			/>
		</UniversalDetail>
	)
}
