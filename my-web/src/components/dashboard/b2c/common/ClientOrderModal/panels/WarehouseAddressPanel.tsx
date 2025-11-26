'use client'

import React, { useState, useCallback, KeyboardEvent, useEffect } from 'react'
import { Warehouse, Copy, Check, MapPinned, MapPin } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import Flag from '@/components/common/Flag'
import { getLogo } from '@/utils/getLogo'

/* -------------------------------
   HOOK: sprawdzamy czy mobile
-------------------------------- */
function useIsMobile() {
    const [mobile, setMobile] = useState(false)
    useEffect(() => {
        const check = () => setMobile(window.innerWidth < 640)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])
    return mobile
}

/* -------------------------------
   ROW komponent
-------------------------------- */
type WarehouseAddrRowProps = {
    label: string
    value: string
    labelIcon?: React.ReactNode
    valueIcon?: React.ReactNode
    copyable?: boolean
}

const WarehouseAddrRow: React.FC<WarehouseAddrRowProps> = ({
    label,
    value,
    labelIcon,
    valueIcon,
    copyable = true,
}) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(
        async (e?: React.MouseEvent | KeyboardEvent) => {
            e?.stopPropagation()
            if (!value || !copyable) return

            try {
                await navigator.clipboard.writeText(value)
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
            } catch (err) {
                console.error('Failed to copy text: ', err)
                setCopied(false)
            }
        },
        [value, copyable],
    )

    const clickable = copyable

    const onRowKey = (e: KeyboardEvent<HTMLDivElement>) => {
        if (!clickable) return
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            void handleCopy(e)
        }
    }

    return (
        <div
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : -1}
            onClick={clickable ? e => void handleCopy(e) : undefined}
            onKeyDown={clickable ? onRowKey : undefined}
            className={[
                'group flex items-center justify-between',
                'pl-3 sm:pl-4 pr-3 sm:pr-4',
                'min-h-[52px] sm:min-h-[56px] py-1.5 sm:py-2',
                'font-heebo_regular text-[13px] border-b border-light-blue last:border-b-0',
                clickable
                    ? 'cursor-pointer transition-colors hover:bg-middle-blue/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue'
                    : '',
                'odd:bg-white even:bg-light-blue/16',
            ].join(' ')}
        >
            {/* LEFT */}
            <div className='flex items-center gap-2.5 tracking-wide opacity-70 select-none shrink-0 pr-4'>
                {labelIcon}
                <span>{label}</span>
            </div>

            {/* RIGHT */}
            <div className='flex items-center gap-2 flex-1 justify-end'>
                <div className='flex items-center gap-2'>
                    {valueIcon}
                    <span className='text-[14px] font-medium text-middle-blue text-left md:text-right tracking-wide'>
                        {value}
                    </span>
                </div>

                {copyable && (
                    <span className={['text-[11px] opacity-60 ml-2 text-right', copied ? 'inline-block' : 'hidden'].join(' ')}>
                        Copied!
                    </span>
                )}

                {copyable && (
                    <button
                        type='button'
                        onClick={e => void handleCopy(e)}
                        title='Copy'
                        aria-label='Copy'
                        className='inline-flex items-center justify-center rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue focus-visible:ring-offset-1 ml-1'
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                )}
            </div>
        </div>
    )
}

/* -------------------------------
   Dane
-------------------------------- */
const addressData = [
    { label: 'Recipient', value: 'Jakub Małota' },
    { label: 'Phone', value: '+48 784 317 005' },
    { label: 'E-mail', value: 'delivery@polandexportflow.com' },
    { label: 'Street', value: 'Przyjaciół 3' },
    { label: 'Postal Code', value: '42-400' },
    { label: 'City', value: 'Zawiercie' },
    { label: 'Country', value: 'Poland' },
]

const lockerData = [
    { label: 'InPost', value: 'ZAW10M (10 Leśna St)', logoKey: 'inpost' },
    { label: 'Orlen Paczka', value: 'Locker 724739 (119 Piłsudskiego St)', logoKey: 'orlen' },
    { label: 'DPD Pickup', value: 'PL88792 (119 Piłsudskiego St)', logoKey: 'dpd' },
    { label: 'Pocztex', value: 'P24045 (119 Piłsudskiego St)', logoKey: 'pocztapolska' },
    { label: 'DHL', value: 'Locker 724739 (119 Piłsudskiego St)', logoKey: 'dhl' },
]

/* -------------------------------
   KOMPONENT GŁÓWNY
-------------------------------- */
export default function WarehouseAddressPanel() {
    const isMobile = useIsMobile()

    return (
        <UniversalDetail
            title='Our Warehouse Address'
            icon={<Warehouse className='h-5 w-5' />}
            collapsible
            defaultOpen={false} 
            defaultOpenMobile={false}
            className='bg-white border-light-blue'
        >
            <div className='flex flex-col gap-6 mt-2'>
                {/* ===== Direct address ===== */}
                <div className='bg-ds-light-blue rounded-md p-4 md:p-5'>
                    <div className='flex items-start gap-2 mb-4 min-h-[20px] text-middle-blue/80'>
                        <MapPin className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                        <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                            Direct Shipping Address
                        </span>
                    </div>

                    <div className='rounded-md overflow-hidden border border-middle-blue/10'>
                        {addressData.map(item => {
                            if (item.label === 'Country') {
                                return (
                                    <WarehouseAddrRow
                                        key={item.label}
                                        label={item.label}
                                        value={item.value}
                                        valueIcon={<Flag iso='PL' title='Poland' />}
                                        copyable={true}
                                    />
                                )
                            }
                            return (
                                <WarehouseAddrRow key={item.label} label={item.label} value={item.value} copyable={true} />
                            )
                        })}
                    </div>
                </div>

                {/* ===== Parcel Lockers ===== */}
                <div className='bg-ds-light-blue rounded-md p-4 md:p-5'>
                    <div className='flex items-start gap-2 mb-4 min-h-[20px] text-middle-blue/80'>
                        <MapPinned className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                        <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                            Available Parcel Lockers
                        </span>
                    </div>

                    <div className='rounded-md overflow-hidden border border-middle-blue/10'>
                        {lockerData.map(item => {
                            let logoHeight = 18
                            if (item.logoKey === 'inpost' || item.logoKey === 'orlen') logoHeight = 25
                            if (item.logoKey === 'dpd') logoHeight = 23
                            if (item.logoKey === 'dhl') logoHeight = 14

                            const logoSrc = getLogo('carrier', item.logoKey)

                            const iconToShow = isMobile
                                ? null
                                : logoSrc ? (
                                        <img
                                            src={logoSrc}
                                            alt={item.label}
                                            className='block shrink-0 object-contain'
                                            style={{ height: logoHeight, maxWidth: 90 }}
                                        />
                                    )
                                : null

                            return (
                                <WarehouseAddrRow
                                    key={item.label}
                                    label={item.label}
                                    value={item.value}
                                    labelIcon={iconToShow}
                                    copyable={false}
                                />
                            )
                        })}
                    </div>
                </div>

            </div>
        </UniversalDetail>
    )
}