'use client'

import React, { useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import { getLogo } from '@/utils/getLogo'
import { CreditCard, Copy, Mail, Banknote, Shield } from 'lucide-react'
import type { MethodCode, Currency } from '../../clientOrderTypes'

type Props = {
    isOpen: boolean
    onClose: () => void
    orderNumber: string
    amount: number
    currency: Currency | string
    method: MethodCode | string
    onPayClick?: () => void
    onStripeRedirect: (methodCode: MethodCode | string, amount: number) => void 
}

const fmtMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.round((Number(amount) || 0) * 100) / 100)

const METHOD_META: Record<
    string,
    {
        title: string
        icon?: React.ReactNode
        primaryLabel: string
        primaryValue: string
        secondary?: string
        isStripeGroup: boolean 
    }
> = {
    paypal: {
        title: 'PayPal',
        icon: <Mail className='w-4 h-4' />,
        primaryLabel: 'Recipient address',
        primaryValue: 'poland.export.flow@gmail.com',
        secondary: 'Send as “Goods & Services” in the same currency.',
        isStripeGroup: false,
    },
    revolut: {
        title: 'Revolut',
        icon: <Banknote className='w-4 h-4' />,
        primaryLabel: 'Recipient username',
        primaryValue: '@PolandExportFlow',
        secondary: 'Peer-to-peer transfer in the same currency.',
        isStripeGroup: false,
    },
    stripe: {
        title: 'Card & Other Methods',
        icon: <CreditCard className='w-4 h-4' />,
        primaryLabel: 'Payment Processor',
        primaryValue: 'Securely processed by Stripe',
        secondary: 'You will be redirected to the secure Stripe payment gateway where you can select your preferred payment method (Card, BLIK, Google Pay, etc.).',
        isStripeGroup: true,
    },
}

// ZMIANA: Lista logo dla Stripe
const STRIPE_HEADER_LOGOS = [
    getLogo('payment', 'visa'),
    getLogo('payment', 'mastercard'),
    getLogo('payment', 'googlepay'),
    getLogo('payment', 'applepay'),
].filter(Boolean) as string[]

// ZMIANA: Zwiększone domyślne rozmiary logo (ZWIĘKSZONO DO 28PX WYSOKOŚCI)
const HEADER_LOGO_HEIGHT = 28; // Zwiększono
const HEADER_LOGO_MAX_WIDTH = 60; // Zwiększono


export default function CheckoutPaymentModal({
    isOpen,
    onClose,
    orderNumber,
    amount,
    currency,
    method,
    onPayClick,
    onStripeRedirect, 
}: Props) {
    const methodKey = String(method || 'paypal').toLowerCase()
    const meta = METHOD_META[methodKey] ?? METHOD_META.paypal

    const isStripeGroupMethod = meta.isStripeGroup
    const handlePayAction = () => {
        if (isStripeGroupMethod) {
            onStripeRedirect(methodKey, amount)
        } else {
            onPayClick?.()
        }
    }

    const amountLabel = useMemo(() => fmtMoney(amount, String(currency || 'PLN')), [amount, currency])
    const logo = getLogo('payment', methodKey) || ''
    const copy = (txt: string) => navigator.clipboard.writeText(String(txt)).catch(() => {})

    // ZMIANA: Definicja akcji dla nagłówka
    const headerActions = useMemo(() => {
        if (isStripeGroupMethod) {
            return (
                <div className='flex items-center gap-1.5 sm:gap-2'>
                    {STRIPE_HEADER_LOGOS.map((src, index) => (
                        <img 
                            key={index} 
                            src={src} 
                            alt={`Payment logo ${index}`} 
                            className='block object-contain'
                            style={{ height: HEADER_LOGO_HEIGHT, maxWidth: HEADER_LOGO_MAX_WIDTH }}
                            draggable={false}
                        />
                    ))}
                </div>
            )
        }
        // W przypadku PayPal/Revolut, używamy jednego logo
        return logo ? ( 
            <img
                src={logo}
                alt={meta.title}
                className='block object-contain'
                style={{ height: 20, maxWidth: 110 }}
                draggable={false}
            />
        ) : (
            <span className='block' style={{ height: 20, width: 110 }} />
        );
    }, [isStripeGroupMethod, logo, meta.title]);


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size='md'
            panelMaxWidth='720px'
            title={
                <span className='flex items-center gap-2'>
                    <CreditCard className='h-5 w-5' /> Payment — {meta.title}
                </span>
            }
        >
            <div className='rounded-md bg-white border border-middle-blue/20 overflow-hidden'>
                {/* HEADER WEWNĘTRZNEGO BODY MODALA */}
                <div className='flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5'>
                    <div className='flex items-center gap-2 text-middle-blue/70 text-[13px]'>
                        {meta.icon} <span>{meta.title}</span>
                    </div>
                    
                    {/* Logika wyświetlania logo w wewnętrznym nagłówku BODY */}
                    {headerActions}

                </div>
                <div className='h-px bg-middle-blue/10' />

                {/* BODY */}
                <div className='px-5 py-5 sm:px-6 sm:py-6 space-y-5'>
                    {/* Recipient / Processor */}
                    <div className='space-y-2'>
                        <div className='text-[12px] text-middle-blue/70'>{meta.primaryLabel}</div>
                        <div className='flex items-center justify-between gap-2'>
                            <span className='text-[14px] font-heebo_medium text-middle-blue break-all'>
                                {meta.primaryValue}
                            </span>
                            {meta.primaryValue && !isStripeGroupMethod && ( 
                                <button
                                    onClick={() => copy(meta.primaryValue)}
                                    className='p-1.5 rounded-md hover:bg-middle-blue/10 text-middle-blue transition-colors'
                                    title='Copy'
                                    aria-label='Copy recipient'
                                >
                                    <Copy className='w-4 h-4' />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Title (tylko dla metod z instrukcją) */}
                    {!isStripeGroupMethod && (
                        <div className='space-y-2'>
                            <div className='text-[12px] text-middle-blue/70'>Payment title</div>
                            <div className='flex items-center justify-between gap-2'>
                                <span className='text-[14px] font-heebo_medium text-middle-blue whitespace-nowrap'>
                                    Order {orderNumber}
                                </span>
                                <button
                                    onClick={() => copy(`Order ${orderNumber}`)}
                                    className='p-1.5 rounded-md hover:bg-middle-blue/10 text-middle-blue transition-colors'
                                    title='Copy'
                                    aria-label='Copy payment title'
                                >
                                    <Copy className='w-4 h-4' />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Additional info */}
                    {meta.secondary && (
                        <div className='space-y-2'>
                            <div className='text-[12px] text-middle-blue/70'>Additional information</div>
                            <div className='text-[14px] font-heebo_medium text-middle-blue break-words leading-snug'>
                                {meta.secondary}
                            </div>
                        </div>
                    )}

                    {/* Amount */}
                    <div className='flex items-center justify-between pt-3'>
                        <div className='text-[13px] text-middle-blue/70'>Amount due</div>
                        <div className='text-middle-blue font-heebo_medium text-[18px] tabular-nums'>{amountLabel}</div>
                    </div>

                    {/* Button */}
                    <button
                        type='button'
                        onClick={handlePayAction} 
                        disabled={!Number.isFinite(amount) || amount <= 0}
                        className='w-full h-[56px] rounded-lg bg-middle-blue text-white flex items-center justify-center gap-2
                        hover:bg-middle-blue/90 active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-middle-blue/40 transition-all disabled:opacity-60'
                    >
                        <CreditCard className='w-5 h-5' />
                        <span className='text-[15px] tracking-wide'>
                            {isStripeGroupMethod ? 'Go to Payment' : 'Pay now'}
                        </span>
                    </button>

                    {/* Footer note */}
                    <div className='text-[12px] text-middle-blue/60 text-center leading-snug'>
                        {isStripeGroupMethod ? (
                            <>
                                You will be redirected to the secure payment page.
                            </>
                        ) : (
                            <>
                                After sending the payment, please keep the confirmation.
                                <br />
                                <br />
                                If you contact support, include “Order {orderNumber}”.
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}