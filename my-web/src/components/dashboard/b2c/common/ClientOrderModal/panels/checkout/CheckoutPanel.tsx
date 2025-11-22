'use client'

import React, { useMemo, useState, useCallback } from 'react'
import {
    CreditCard,
    PackageSearch,
    Wallet,
    Euro,
    DollarSign,
    PoundSterling,
    BadgeCheck,
    Clock,
    StickyNote,
    CheckCircle,
    Edit3,
} from 'lucide-react'

import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import { getOrderPaymentStatusConfig, type OrderPaymentStatus } from '@/utils/orderPaymentStatus'
import UniversalChoice from '@/components/ui/UniversalChoice'
import { getLogo } from '@/utils/getLogo'

import CheckoutPaymentModal from './CheckoutPaymentModal'
import CheckoutSummary from './CheckoutSummary'
import CheckoutButtons from './CheckoutButtons'

import type { CheckoutPanelDB, ShippingQuote, Currency, MethodCode, PaymentMethod } from '../../clientOrderTypes'
import { useClientOrderModalCtx } from '../../ClientOrderModal.ctx'
import { useCheckout } from '../../hooks/useCheckout'

type Props = {
    orderNumber: string
    checkout: CheckoutPanelDB
    orderType?: string | null
    fxRates?: Partial<Record<Currency, number>>
    paymentFees?: Partial<Record<MethodCode | string, number>>
    onSelectQuote?: (quoteId: string) => void
}

const carrierKeyFromLabel = (label?: string) => {
    const raw = (label || '').toLowerCase().replace(/\s+/g, '')
    const candidates = [raw, raw.replace(/[^a-z0-9]/g, ''), raw.replace(/-/g, '')]
    if (/poczta/.test(raw) || /polishpost/.test(raw)) candidates.unshift('pocztapolska')
    for (const k of candidates) if (getLogo('carrier', k)) return k
    return raw
}
const carrierLogoH = (key?: string) => {
    const k = String(key || '').toLowerCase()
    if (!k) return 20
    if (k.includes('dhl')) return 11
    if (k.includes('ups')) return 26
    if (k.includes('fedex')) return 24
    return 20
}

const ProductPaymentBox = ({
    title,
    amount,
    icon,
    currency,
    variant,
}: {
    title: string
    amount: number
    icon: React.ReactNode
    currency: string
    variant: 'green' | 'orange'
}) => {
    const formattedAmount = `${(amount || 0).toFixed(2)} ${currency}`

    let containerStyle: React.CSSProperties = {
        backgroundColor: '#FFEDD5',
        borderColor: '#9A341266',
    }
    let iconContainerStyle: React.CSSProperties = { backgroundColor: '#FED7AA' }
    let textStyle: React.CSSProperties = { color: '#9A3412' }
    let iconStyle: React.CSSProperties = { color: '#9A3412' }
    let titleStyle: React.CSSProperties = { color: '#9A3412' }

    if (variant === 'green') {
        containerStyle = { backgroundColor: '#D1FAE5', borderColor: '#065F4666' }
        iconContainerStyle = { backgroundColor: '#A7F3D0' }
        textStyle = { color: '#065F46' }
        iconStyle = { color: '#065F46' }
        titleStyle = { color: '#065F46' }
    }

    return (
        <div
            className='flex gap-4 rounded-lg border p-4 mt-2 items-start transition-colors duration-150 cursor-default'
            style={containerStyle}>
            <div className='grid place-items-center h-11 w-10 shrink-0 rounded-lg bg-green' style={iconContainerStyle}>
                {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5', style: iconStyle })}
            </div>
            <div>
                <div className='text-[12px] leading-normal tracking-wide mb-2 flex items-center gap-1.5' style={titleStyle}>
                    <span>{title}</span>
                </div>
                <div className='text-[16px] font-heebo_medium tracking-wider leading-none tabular-nums' style={textStyle}>
                    {formattedAmount}
                </div>
            </div>
        </div>
    )
}

export default function CheckoutPanel({
    orderNumber,
    checkout: cp,
    orderType,
    fxRates = { PLN: 1 },
    paymentFees = {},
    onSelectQuote,
}: Props) {
    const [payOpen, setPayOpen] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState(0)
    const { refreshSoft } = useClientOrderModalCtx()

    const checkout = useCheckout({ orderNumber, cp, fxRates, paymentFees })

    const handleStripeRedirect = useCallback(
        async (methodCode: MethodCode | string, amount: number) => {
            setPayOpen(false)

            const payload = {
                order: orderNumber,
                amount: amount,
                currency: checkout.currency,
                // ZMIANA: Jeśli wybrano 'stripe', wysyłamy ogólny kod STRIPE_CARD do API
                method: methodCode === 'stripe' ? 'STRIPE_CARD' : methodCode,
            }

            console.log('Redirecting to Stripe with payload:', payload)

            alert(
                `SIMULATION: Redirecting to Stripe for ${methodCode.toUpperCase()} payment of ${checkout.format(
                    amount
                )}. Check console for payload.`
            )
        },
        [orderNumber, checkout.currency, checkout.format]
    )

    const shippingOptions = useMemo(() => {
        return (cp.quotes || []).map((q: ShippingQuote) => {
            const labelCarrier = q?.quote_carrier || ''
            const key = carrierKeyFromLabel(labelCarrier)
            const logo = getLogo('carrier', key)
            const eta =
                q?.quote_delivery_days != null
                    ? `Delivery time from our warehouse: ${q.quote_delivery_days} day${q.quote_delivery_days === 1 ? '' : 's'}`
                    : 'Delivery time not specified'
            const priceInCurrent = checkout.fromPLN(Number(q?.quote_carrier_fee || 0))
            const note = (q?.quote_note || '').trim()
            const h = carrierLogoH(key)

            return {
                value: String(q.id),
                label: (
                    <div className='w-full pointer-events-none flex flex-col gap-4 pr-8 sm:pr-10'>
                        <div className='grid grid-cols-[auto_1fr] items-center gap-2 min-w-0'>
                            {logo ? (
                                <img
                                    src={logo}
                                    alt='carrier'
                                    className='block shrink-0 object-contain'
                                    style={{ height: h, maxWidth: 120 }}
                                    draggable={false}
                                />
                            ) : (
                                <span className='h-5 w-10 shrink-0' />
                            )}
                            <div className='min-w-0 flex items-center gap-2'>
                                <span className='text-[14px] text-middle-blue/90 font-heebo_medium truncate'>
                                    {labelCarrier || '—'}
                                </span>
                                <span className='text-[14px] text-middle-blue/60 whitespace-nowrap'>
                                    ({checkout.format(priceInCurrent)})
                                </span>
                            </div>
                        </div>

                        <div className='flex flex-col gap-2 min-w-0'>
                            <div className='flex items-start gap-1.5 text-[12px] text-middle-blue/70 min-w-0'>
                                <Clock className='h-3.5 w-3.5 shrink-0 mt-[1px]' />
                                <span className='block min-w-0 whitespace-normal break-words leading-[1.25]'>{eta}</span>
                            </div>
                            {note ? (
                                <div className='flex items-start gap-1.5 text-[12px] text-middle-blue/70 min-w-0'>
                                    <StickyNote className='h-3.5 w-3.5 shrink-0 mt-[1px]' />
                                    <span className='block min-w-0 whitespace-normal break-words leading-[1.25]'>{note}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ),
            }
        })
    }, [cp.quotes, checkout.fromPLN, checkout.format])

    const currencyOptions = useMemo(() => {
        const mk = (icon: React.ReactNode, text: string) => (
            <div className='flex items-center justify-start gap-2 pointer-events-none'>
                {icon}
                <span className='font-heebo_medium text-[14px] leading-none'>{text}</span>
            </div>
        )
        return [
            { value: 'PLN', label: mk(<Wallet className='w-5 h-5' />, 'PLN') },
            { value: 'EUR', label: mk(<Euro className='w-5 h-5' />, 'EUR') },
            { value: 'USD', label: mk(<DollarSign className='w-5 h-5' />, 'USD') },
            { value: 'GBP', label: mk(<PoundSterling className='w-5 h-5' />, 'GBP') },
        ]
    }, [])

    const logos: Record<MethodCode, string | undefined> = useMemo(
        () =>
            ({
                paypal: getLogo('payment', 'paypal'),
                revolut: getLogo('payment', 'revolut'),
                stripe: undefined, // Użyjemy grupy logotypów w opcji
            } as Record<MethodCode, string | undefined>),
        []
    )

    const mkLogoLabel = (src?: string, alt?: string) => (
        // KLUCZOWA POPRAWKA: Usunięcie pointer-events-none
        <span className='flex items-center justify-start'>
            {src ? (
                <img
                    src={src}
                    alt={alt || 'method'}
                    className='block object-contain h-5 md:h-4'
                    style={{ maxWidth: 90 }}
                    draggable={false}
                />
            ) : (
                alt
            )}
        </span>
    )

    const methodOptions = useMemo(() => {
        const methods = checkout.methods || []

        const uniqueMethods = new Map<MethodCode | string, PaymentMethod>();
        (methods || []).forEach(m => {
            uniqueMethods.set(m.code.toLowerCase(), m); 
        });

        // Symulujemy listę logo dla Stripe (wizualne reprezentacje kart/e-walletów)
        const STRIPE_GROUP_LOGOS = [
            getLogo('payment', 'visa'),
            getLogo('payment', 'mastercard'),
            // ZMIANA: USUNIĘTO BLIK Z WIZUALIZACJI
            // getLogo('payment', 'blik'), 
            getLogo('payment', 'googlepay'),
            getLogo('payment', 'applepay'),
        ].filter(Boolean) as string[]

        // Tworzymy opcje bazowe (PayPal, Revolut)
        const baseOptions = Array.from(uniqueMethods.values()).map(m => {
             const src = logos[m.code as MethodCode]
             return {
                 value: m.code as MethodCode,
                 label: mkLogoLabel(src, m.name || m.code.toUpperCase()),
                 isStripe: m.code === 'stripe',
             }
        }).filter(o => o.value !== 'stripe'); // Usuwamy 'stripe' z listy opcji 2-kolumnowych, jeśli przyszedł z serwera

        // Tworzymy opcję STRIPE (elektroniczną), która ma zająć całą szerokość
        let stripeOption: { value: MethodCode; label: React.ReactNode; isStripe: boolean } | undefined = undefined

        if (STRIPE_GROUP_LOGOS.length > 0) {
            const LOGO_HEIGHT = 30
            const LOGO_MAX_WIDTH = 72 

            stripeOption = {
                value: 'stripe' as MethodCode,
                label: (
                    <span className='flex items-center gap-2'>
                        {STRIPE_GROUP_LOGOS.map((src, index) => (
                            <img
                                key={index}
                                src={src}
                                alt='payment method logo'
                                className='block object-contain'
                                style={{ height: LOGO_HEIGHT, maxWidth: LOGO_MAX_WIDTH }}
                                draggable={false}
                            />
                        ))}
                    </span>
                ),
                isStripe: true,
            }
        }

        // Łączymy: PayPal/Revolut (manualne) + Stripe (elektroniczne)
        const manualOptions = baseOptions.filter(o => o.value === 'paypal' || o.value === 'revolut');
        
        return {
            manualOptions: manualOptions.filter(Boolean) as { value: MethodCode; label: React.ReactNode }[],
            stripeOption: stripeOption ? [stripeOption] : [],
        }
    }, [checkout.methods, logos])

    const showStatus =
        !!(cp?.payment_status as OrderPaymentStatus | undefined) &&
        !['none', 'note'].includes(String(cp.payment_status).toLowerCase())

    const selectedQuote = useMemo(
        () => (cp.quotes || []).find(q => String(q.id) === String(checkout.selectedQuoteId)) ?? null,
        [cp.quotes, checkout.selectedQuoteId]
    )

    const showProductFields = orderType !== 'Parcel Forwarding'

    const productsAmount = checkout.fromPLN(checkout.breakdown.productsPLN)
    const serviceAmount = checkout.fromPLN(checkout.breakdown.shippingPLN + checkout.breakdown.serviceFeePLN)
    const totalAmount = checkout.breakdown.total

    const openPaymentModal = (amount: number) => {
        setPaymentAmount(amount)
        setPayOpen(true)
    }

    return (
        <>
            <UniversalDetail
                title='Checkout'
                icon={<PackageSearch className='h-5 w-5' />}
                collapsible
                defaultOpen={true}
                defaultOpenMobile={false}
                className='bg-white border-light-blue'>
                {showStatus && (
                    <>
                        <DetailRow
                            icon={<BadgeCheck className='w-3.5 h-3.5' />}
                            label='Payment status'
                            value={
                                <UniversalStatusBadge
                                    status={cp.payment_status as OrderPaymentStatus}
                                    getConfig={getOrderPaymentStatusConfig}
                                />
                            }
                            className='!border-b-0'
                        />
                    </>
                )}
                {showProductFields && (
                    <>
                        <div className='mt-2 mb-6 bg-ds-light-blue rounded-md p-4'>
                            <p className='block text-[13px] opacity-70'>Products Payment</p>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                <ProductPaymentBox
                                    title='Products Due'
                                    amount={cp.split_due || 0}
                                    icon={<Clock />}
                                    currency={checkout.currency}
                                    variant='orange'
                                />
                                <ProductPaymentBox
                                    title='Products Paid'
                                    amount={cp.split_received || 0}
                                    icon={<CheckCircle />}
                                    currency={checkout.currency}
                                    variant='green'
                                />
                            </div>
                        </div>
                        <hr className='my-6 border-light-blue/50' />
                    </>
                )}
                <div className='mt-2 mb-6 bg-ds-light-blue rounded-md p-4'>
                    <p className='block mb-2 text-[13px] opacity-70'>Shipping</p>
                    {shippingOptions.length > 0 ? (
                        <UniversalChoice
                            ariaLabel='Choose shipping option'
                            cols={{ base: 1 }}
                            size='lg'
                            value={checkout.selectedQuoteId || undefined}
                            onChange={async val => {
                                const id = String(val as string)
                                await checkout.saveQuote(id)
                                await refreshSoft?.()
                                onSelectQuote?.(id)
                            }}
                            options={shippingOptions as unknown as Array<{ value: string; label: React.ReactNode }>}
                            showSelectionDot
                            contentAlign='between'
                        />
                    ) : (
                        <div className='p-4 text-[14px] text-middle-blue/75 bg-ds-middle-blue w-full border border-middle-blue/14 rounded-md'>
                            No shipping quotes available yet.
                        </div>
                    )}
                </div>

                <>
                    <hr className='my-6 border-light-blue/50' />
                    <div className='mt-6 bg-ds-light-blue rounded-md p-4'>
                        <p className='block mb-2 text-[13px] opacity-70'>Currency</p>
                        <UniversalChoice
                            ariaLabel='Choose currency'
                            cols={{ base: 2 }}
                            size='sm'
                            value={checkout.currency.toUpperCase()}
                            onChange={async v => {
                                await checkout.saveCurrency(String(v))
                                await refreshSoft?.()
                            }}
                            options={currencyOptions as unknown as Array<{ value: string; label: React.ReactNode }>}
                            showSelectionDot
                            contentAlign='start'
                        />
                    </div>

                    <hr className='my-6 border-light-blue/50' />
                    <div className='mt-6 bg-ds-light-blue rounded-md p-4'>
                        <p className='block mb-2 text-[13px] opacity-70'>Payment Method</p>

                        {/* RĘCZNE METODY (PayPal i Revolut) w siatce 2-kolumnowej */}
                        {methodOptions.manualOptions.length > 0 && (
                            <UniversalChoice
                                ariaLabel='Choose manual payment method'
                                cols={{ base: 1, sm: 2 }}
                                size='md'
                                value={checkout.method?.code}
                                onChange={async v => {
                                    await checkout.saveMethod(String(v))
                                    await refreshSoft?.()
                                }}
                                options={methodOptions.manualOptions as unknown as Array<{ value: string; label: React.ReactNode }>}
                                showSelectionDot
                                contentAlign='start'
                                className='mb-2'
                            />
                        )}

                        {/* STRIPE (płatność kartą/online) w siatce 1-kolumnowej (100% szerokości) */}
                        {methodOptions.stripeOption.length > 0 && (
                            <UniversalChoice
                                ariaLabel='Choose electronic payment method'
                                cols={{ base: 1 }} // KLUCZOWE: Zawsze 1 kolumna, aby zająć 100% szerokości kontenera
                                size='md'
                                value={checkout.method?.code}
                                onChange={async v => {
                                    await checkout.saveMethod(String(v))
                                    await refreshSoft?.()
                                }}
                                options={methodOptions.stripeOption as unknown as Array<{ value: string; label: React.ReactNode }>}
                                showSelectionDot
                                contentAlign='start'
                            />
                        )}
                    </div>

                    <hr className='my-6 border-light-blue/50' />

                    {checkout.error && (
                        <div className='mt-3 rounded-md border border-red/30 bg-red/5 p-3 text-[13px] text-red/80'>
                            {checkout.error}
                        </div>
                    )}
                    <CheckoutButtons
                        orderNumber={orderNumber}
                        showProductFields={showProductFields}
                        productsAmount={productsAmount}
                        serviceAmount={serviceAmount}
                        totalAmount={totalAmount}
                        checkout={checkout}
                        onOpenModal={openPaymentModal}
                    />
                    <hr className='my-6 border-light-blue/50' />
                    <div className='mt-2'>
                        <CheckoutSummary
                            currency={checkout.currency.toUpperCase() as Currency}
                            breakdown={checkout.breakdown}
                            fromPLN={checkout.fromPLN}
                            format={checkout.format}
                            methodKey={(checkout.method?.code || 'paypal') as MethodCode}
                            effectiveQuote={selectedQuote || undefined}
                        />
                    </div>
                </>
            </UniversalDetail>

            <CheckoutPaymentModal
                isOpen={payOpen}
                onClose={() => setPayOpen(false)}
                orderNumber={orderNumber}
                amount={paymentAmount}
                currency={checkout.currency.toUpperCase()}
                method={(checkout.method?.code || 'paypal') as MethodCode}
                onPayClick={() => alert('SIMULATION: Manual payment (PayPal/Revolut) instructions confirmed.')}
                onStripeRedirect={handleStripeRedirect}
            />
        </>
    )
}