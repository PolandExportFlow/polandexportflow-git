'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin, User2, Mail, Phone, MessageSquareText, Home, Settings, Loader2 } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import Flag from '@/components/common/Flag'
import type { AddressPanelDB } from '../clientOrderTypes'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

// Hooks
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import { useAddress } from '../hooks/useAddress'

const EMPTY: AddressPanelDB = {
    order_fullname: null, order_email: null, order_phone: null,
    order_country: null, order_city: null, order_postal_code: null,
    order_street: null, order_house_number: null, order_delivery_notes: null,
}

export default function AddressPanelClient() {
    const { data, ui } = useClientOrderModalCtx()
    const { updateAddress, loadAndSetDefaultAddress } = useAddress()
  
    const address = data?.addressPanel ?? EMPTY
    
    // ✅ Logika jest w useOrderUI, my tu tylko z niej korzystamy
    const canEdit = ui.canEdit 

    const [form, setForm] = useState<AddressPanelDB>(address)
    const [editing, setEditing] = useState<keyof AddressPanelDB | null>(null)
    const [isLoadingDefault, setIsLoadingDefault] = useState(false)

    useEffect(() => { setForm(address) }, [address])

    const handleCommit = async (field: keyof AddressPanelDB, rawVal: string | null) => {
        if (!canEdit) return
        const v = (rawVal ?? '').trim() || null
        if (form[field] === v) { setEditing(null); return }
    
        setForm(prev => ({ ...prev, [field]: v }))
        setEditing(null)
        await updateAddress({ [field]: v })
    }

    const handleLoadDefault = async () => {
        if (!canEdit) return
        setIsLoadingDefault(true)
        try {
            await loadAndSetDefaultAddress()
        } finally {
            setIsLoadingDefault(false)
        }
    }

    const countryInfo = useMemo(() => getCountryInfoByName(form.order_country), [form.order_country])
    const countryIso = countryInfo?.code?.toUpperCase()

    const renderField = (field: keyof AddressPanelDB, label: string, icon: React.ReactNode, placeholder: string) => (
        <DetailRow
            icon={icon}
            label={label}
            actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing(field) }] : []}
            value={
                editing === field && canEdit ? (
                    <UniversalTableInput
                        value={form[field] ?? ''}
                        mode='text' align='right' placeholder={placeholder} widthPx={220} compactMobile autoStartEditing
                        onCommit={v => handleCommit(field, v)}
                        onCancel={() => setEditing(null)}
                    />
                ) : (
                    <span className={`select-text ${form[field] ? '' : 'opacity-50'} ${!canEdit ? 'text-middle-blue/80' : ''}`}>
                        {field === 'order_country' ? (
                            <span className='inline-flex items-center gap-2'>
                                {countryIso && <Flag iso={countryIso} title={form[field] || ''} />}
                                {form[field] || placeholder}
                            </span>
                        ) : (
                            form[field] || placeholder
                        )}
                    </span>
                )
            }
            valueText={form[field] ?? ''}
        />
    )

    return (
        <UniversalDetail
            title='Address'
            icon={<MapPin className='h-5 w-5' />}
            className='bg-white border-light-blue'
            collapsible
            defaultOpen={false}
            defaultOpenMobile={false}
        >
            {renderField('order_fullname', 'Full Name', <User2 className='w-3.5 h-3.5'/>, 'Name & Surname')}
            {renderField('order_email', 'E-mail', <Mail className='w-3.5 h-3.5'/>, 'E-mail')}
            {renderField('order_phone', 'Phone', <Phone className='w-3.5 h-3.5'/>, 'Phone number')}
            {renderField('order_country', 'Country', <MapPin className='w-3.5 h-3.5'/>, 'Country')}
            {renderField('order_city', 'City', <MapPin className='w-3.5 h-3.5'/>, 'City')}
            {renderField('order_postal_code', 'Postal Code', <MapPin className='w-3.5 h-3.5'/>, 'Zip Code')}
            {renderField('order_street', 'Street', <MapPin className='w-3.5 h-3.5'/>, 'Street')}
            {renderField('order_house_number', 'House No.', <MapPin className='w-3.5 h-3.5'/>, 'Number')}
            
            <DetailRow
                icon={<MessageSquareText className='w-3.5 h-3.5' />}
                label='Delivery Notes'
                className='!border-b-0'
                actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_delivery_notes') }] : []}
                value={
                    editing === 'order_delivery_notes' && canEdit ? (
                        <UniversalTableInput
                            value={form.order_delivery_notes ?? ''}
                            mode='text' align='right' placeholder='Notes...' widthPx={220} compactMobile autoStartEditing
                            onCommit={v => handleCommit('order_delivery_notes', v)}
                            onCancel={() => setEditing(null)}
                        />
                    ) : (
                        <span className={`whitespace-pre-wrap break-words ${form.order_delivery_notes ? '' : 'opacity-50'}`}>
                            {form.order_delivery_notes || 'Notes for courier...'}
                        </span>
                    )
                }
            />

            {canEdit && (
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 bg-ds-light-blue rounded-md p-4 px-6'>
                    <Link href='/settings' className='inline-flex items-center gap-1.5 text-sm opacity-50 hover:opacity-100 transition'>
                        <Settings className='w-4 h-4' /> Change Default
                    </Link>
                    <button
                        type='button'
                        onClick={handleLoadDefault}
                        disabled={isLoadingDefault}
                        className='inline-flex items-center justify-center gap-2 rounded-md bg-ds-middle-blue border border-middle-blue/30 px-5 py-3 text-[13px] font-medium hover:bg-middle-blue/8 transition disabled:opacity-50'
                    >
                        Load Default Address
                        {isLoadingDefault ? <Loader2 className='h-4 w-4 animate-spin'/> : <Home className='h-4 w-4'/>}
                    </button>
                </div>
            )}
        </UniversalDetail>
    )
}