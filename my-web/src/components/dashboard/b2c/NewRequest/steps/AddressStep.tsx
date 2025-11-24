'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, User, Phone, Building2, Mail, Home, Hash, StickyNote, Settings, Loader2, Download, ArrowRight, AlertCircle, Save, Check } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import UniversalStep from '../common/UniversalStep'
import type { AddressModel } from '../requestTypes'
import UniversalInput from '@/components/ui/UniwersalInput'
import { getCountryInfoByName } from '@/utils/country/countryHelper'
import { useDefaultAddress } from '../hooks/useDefaultAddress'
import { isNonEmptyString } from '@/utils/newRequestFormHelper'

type SelectOption = { value: string; label: string; code?: string }
type OptionLike = string | SelectOption

type ButtonMode = 'load' | 'save'
type ButtonState = 'idle' | 'loading' | 'success'

export default function AddressStep({
    address,
    onChange,
    countries,
    onBack,
    onContinue,
}: {
    address: AddressModel
    onChange: (patch: Partial<AddressModel>) => void
    countries?: OptionLike[]
    onBack?: () => void
    onContinue?: () => void
}) {
    // Supabase client do zapisu danych (jeśli tryb save)
    const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), [])

    // Stan przycisku
    const [btnMode, setBtnMode] = useState<ButtonMode>('load') // Domyślnie 'load', sprawdzimy przy starcie
    const [btnState, setBtnState] = useState<ButtonState>('idle')

    // Normalizacja krajów (bez sortowania, bo helper to robi)
    const normalizedCountries: SelectOption[] = useMemo(() => {
        if (!countries?.length) return []
        return countries.map((o: OptionLike) => {
            if (typeof o === 'string') return { value: o, label: o, code: o.toUpperCase() }
            const label = String(o.label ?? o.value ?? o.code ?? '')
            const code = String(o.code ?? o.value ?? o.label ?? '').toUpperCase()
            return { value: label, label, code }
        })
    }, [countries])

    const hasCountryOptions = normalizedCountries.length > 0

    // Walidacja formularza
    const canContinue = useMemo(() => {
        const a = address
        const countryIsValid = !!getCountryInfoByName(a.order_country)
        return Boolean(isNonEmptyString(a.order_fullname) && isNonEmptyString(a.order_phone) && countryIsValid)
    }, [address])

    const { loadDefaultAddress } = useDefaultAddress()

    // 1. Przy wejściu sprawdzamy, czy user ma zapisany adres w bazie
    useEffect(() => {
        const checkDB = async () => {
            try {
                const data = await loadDefaultAddress()
                const hasData = isNonEmptyString(data.order_fullname) || isNonEmptyString(data.order_country)
                
                if (hasData) {
                    setBtnMode('load')
                    // Opcjonalnie: Auto-fill jeśli formularz pusty
                    if (!address.order_fullname && !address.order_country) {
                        onChange(data)
                    }
                } else {
                    setBtnMode('save')
                }
            } catch (e) {
                console.warn('Check DB failed', e)
            }
        }
        checkDB()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Logika kliknięcia przycisku
    const handleBtnClick = async () => {
        if (btnState === 'loading' || btnState === 'success') return

        setBtnState('loading')

        try {
            if (btnMode === 'load') {
                // TRYB LOAD: Wczytujemy z bazy do formularza
                const data = await loadDefaultAddress()
                onChange(data)
                
                // Efekt sukcesu
                setBtnState('success')
                setTimeout(() => setBtnState('idle'), 2000)

            } else {
                // TRYB SAVE: Zapisujemy obecny formularz do bazy jako domyślny
                if (!canContinue) {
                    // Jeśli formularz niepełny, nie zapisujemy (ewentualnie można dodać prosty alert)
                    setBtnState('idle')
                    return
                }

                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('No user')

                const patch = {
                    default_full_name: address.order_fullname || null,
                    default_phone: address.order_phone || null,
                    default_country: address.order_country || null,
                    default_city: address.order_city || null,
                    default_postal: address.order_postal_code || null,
                    default_street: address.order_street || null,
                    default_apartment: address.order_house_number ? String(address.order_house_number) : null,
                }

                const { error } = await supabase.from('users').update(patch).eq('id', user.id)
                if (error) throw error

                // Po zapisaniu przełączamy tryb na 'load' (bo już mamy dane w bazie)
                setBtnState('success')
                setTimeout(() => {
                    setBtnState('idle')
                    setBtnMode('load') // Przełącz na tryb Load na przyszłość
                }, 2000)
            }
        } catch (e) {
            console.error(e)
            setBtnState('idle')
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
        onChange({ order_country: label })
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
                    placeholder='Gate code, leave at reception, etc.'
                    leftIcon={StickyNote}
                    className='max-h-[76px]'
                />
            </div>

            {/* Pasek akcji dolnych */}
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 bg-ds-light-blue rounded-md p-4 px-6 text-middle-blue'>
                <Link
                    href='/settings'
                    target='_blank'
                    className='group inline-flex items-center gap-3 text-sm opacity-60 hover:opacity-100 hover:text-dark-blue transition-all duration-200'>
                    <Settings className='w-4 h-4' />
                    <span>Manage saved address</span>
                    <ArrowRight className='w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5' />
                </Link>

                <div className='flex flex-col items-end gap-2'>
                    <button
                        type='button'
                        onClick={handleBtnClick}
                        // Blokujemy przycisk "Save" jeśli formularz nie jest wypełniony
                        disabled={btnState === 'loading' || (btnMode === 'save' && !canContinue)}
                        className={`inline-flex items-center justify-center gap-2 rounded-md border px-5 py-3 text-[13px] tracking-wide font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none
                        ${btnState === 'success' 
                            ? 'bg-green border-green text-white' 
                            : 'bg-ds-middle-blue border-middle-blue/30 hover:bg-middle-blue/8 text-middle-blue'}`}
                    >
                        {/* IKONA I TEKST ZALEŻNE OD STANU */}
                        {btnState === 'loading' ? (
                            <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {btnMode === 'load' ? 'Loading...' : 'Saving...'}
                            </>
                        ) : btnState === 'success' ? (
                            <>
                                <Check className='h-4 w-4' />
                                {btnMode === 'load' ? 'Loaded!' : 'Saved!'}
                            </>
                        ) : (
                            <>
                                {btnMode === 'load' ? <Download className='h-4 w-4' /> : <Save className='h-4 w-4' />}
                                {btnMode === 'load' ? 'Load Saved Address' : 'Save as Default Address'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Walidacja - komunikat blokujący przejście dalej */}
            {!canContinue && (
                <div className='mt-6 flex items-center justify-center gap-2 text-[13px] text-middle-blue/70 bg-middle-blue/5 border border-middle-blue/10 p-4 rounded-md animate-in fade-in'>
                    <AlertCircle className='h-4 w-4 text-middle-blue' />
                    <span>Please fill in required fields (<b>Country</b>, <b>Full name</b>, <b>Phone</b>) to continue.</span>
                </div>
            )}
        </UniversalStep>
    )
}