'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MapPin, User, Phone, Building2, Mail, Home, Hash, StickyNote, Settings, Loader2 } from 'lucide-react'
import UniversalStep from '../common/UniversalStep'
import type { AddressModel } from '../requestTypes'
import UniversalInput from '@/components/ui/UniwersalInput'
import { getCountryInfoByName } from '@/utils/country/countryHelper'
import { useDefaultAddress } from '../hooks/useDefaultAddress'

type SelectOption = { value: string; label: string; code?: string }
type OptionLike = string | SelectOption

export default function AddressStep({
	address,
	onChange,
	countries,
	onBack,
	onContinue,
	popularFirst = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'ES', 'IT', 'NL', 'SE'],
}: {
	address: AddressModel
	onChange: (patch: Partial<AddressModel>) => void
	countries?: OptionLike[]
	onBack?: () => void
	onContinue?: () => void
	popularFirst?: string[]
}) {
	const normalizedCountries: SelectOption[] = useMemo(() => {
		if (!countries?.length) return []
		const norm: SelectOption[] = countries.map((o: OptionLike) => {
			if (typeof o === 'string') {
				return { value: o, label: o, code: o.toUpperCase() }
			}
			const label = String(o.label ?? o.value ?? o.code ?? '')
			const code = String(o.code ?? o.value ?? o.label ?? '').toUpperCase()
			return {
				value: label,
				label: label,
				code: code,
			}
		})

		const pop = new Set(popularFirst.map(c => c.toUpperCase()))
		// ⭐️ START POPRAWKI: Dodano 'c.code &&' aby naprawić błąd TS(2345)
		const top = norm.filter(c => c.code && pop.has(c.code)).sort((a, b) => a.label.localeCompare(b.label))
		const rest = norm.filter(c => !c.code || !pop.has(c.code)).sort((a, b) => a.label.localeCompare(b.label))
		// ⭐️ KONIEC POPRAWKI
		return [...top, ...rest]
	}, [countries, popularFirst])

	const hasCountryOptions = normalizedCountries.length > 0

	const canContinue = useMemo(() => {
		const a = address
		const countryIsValid = !!getCountryInfoByName(a.order_country)
		return Boolean(a.order_fullname?.trim() && a.order_phone?.trim() && countryIsValid)
	}, [address])

	const { loadDefaultAddress, isLoading: isLoadingDefault } = useDefaultAddress()

	useEffect(() => {
		const load = async () => {
			try {
				if (!address.order_fullname && !address.order_country) {
					const patch = await loadDefaultAddress()
					onChange(patch)
				}
			} catch (e) {
				console.warn('Could not load default address for new order form.')
			}
		}
		void load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleUseDefault = async () => {
		try {
			const patch = await loadDefaultAddress()
			onChange(patch)
		} catch (e) {
			console.error('Failed to load default address', e)
		}
	}

	const handleCountryChange = (val: any) => {
		let label = ''
		if (typeof val === 'string') {
			const info = getCountryInfoByName(val)
			label = info?.label || val
		} else if (val && typeof val === 'object') {
			label = String(val.label ?? val.value ?? val.code ?? '')
		}
		onChange({
			order_country: label,
		})
	}

	const set = (k: keyof AddressModel) => (v: any) => onChange({ [k]: v })

	return (
		<UniversalStep
			icon={<MapPin className='h-6 w-6 md:w-7 md:h-7 text-middle-blue' />}
			title='Your delivery address'
			onBack={onBack}
			onContinue={canContinue ? onContinue : undefined}
			continueLabel='Continue'
			contentClassName='space-y-2 md:space-y-4 px-1.5'>
			<div className='grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3'>
				<UniversalInput
					label='Country'
					name='order_country'
					type={hasCountryOptions ? 'select' : 'text'}
					value={address.order_country ?? ''}
					onChange={handleCountryChange}
					placeholder={hasCountryOptions ? 'Select country' : 'Country name'}
					required
					options={normalizedCountries}
					showLogos
					leftIcon={MapPin}
				/>
				<UniversalInput
					label='Full name'
					name='order_fullname'
					value={address.order_fullname ?? ''}
					onChange={set('order_fullname')}
					placeholder='John Smith'
					required
					autoComplete='name'
					leftIcon={User}
				/>
				<UniversalInput
					label='Phone number'
					name='order_phone'
					type='tel'
					value={address.order_phone ?? ''}
					onChange={set('order_phone')}
					placeholder='+1 555 123 456'
					required
					inputMode='tel'
					autoComplete='tel'
					leftIcon={Phone}
				/>
			</div>

			<div className='grid grid-cols-2 gap-1 md:gap-3'>
				<UniversalInput
					label='City'
					name='order_city'
					value={address.order_city ?? ''}
					onChange={set('order_city')}
					placeholder='City'
					autoComplete='address-level2'
					leftIcon={Building2}
				/>
				<UniversalInput
					label='Postal code'
					name='order_postal_code'
					value={address.order_postal_code ?? ''}
					onChange={set('order_postal_code')}
					placeholder='Postal code'
					autoComplete='postal-code'
					leftIcon={Mail}
				/>
			</div>

			<div className='grid grid-cols-2 gap-1 md:gap-3'>
				<UniversalInput
					label='Street'
					name='order_street'
					value={address.order_street ?? ''}
					onChange={set('order_street')}
					placeholder='Street name'
					autoComplete='address-line1'
					leftIcon={Home}
				/>
				<UniversalInput
					label='House / Apt'
					name='order_house_number'
					value={address.order_house_number ?? ''}
					onChange={set('order_house_number')}
					placeholder='House No. / Apt'
					autoComplete='address-line2'
					leftIcon={Hash}
				/>
			</div>

			<div className='grid grid-cols-1'>
				<UniversalInput
					label='Notes for delivery'
					name='order_delivery_notes'
					type='textarea'
					value={address.order_delivery_notes ?? ''}
					onChange={set('order_delivery_notes')}
					placeholder='Notes (optional)'
					leftIcon={StickyNote}
					className='max-h-[76px]'
				/>
			</div>

			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 bg-ds-light-blue rounded-md p-4 px-6 text-middle-blue'>
				<Link
					href='/settings'
					className='inline-flex items-center gap-1.5 text-sm opacity-50 hover:opacity-100 transition-opacity duration-200'>
					<Settings className='w-4 h-4' />
					Change default address
				</Link>

				<button
					type='button'
					onClick={handleUseDefault}
					disabled={isLoadingDefault}
					className='inline-flex items-center justify-center gap-2 rounded-md bg-ds-middle-blue border border-middle-blue/30 px-5 py-3 text-[13px] tracking-wide font-medium hover:bg-middle-blue/8 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none'
					title='Use my default address'>
					Use Default Address
					{isLoadingDefault ? <Loader2 className='h-4 w-4 animate-spin' /> : <Home className='h-4 w-4' />}
				</button>
			</div>
		</UniversalStep>
	)
}
