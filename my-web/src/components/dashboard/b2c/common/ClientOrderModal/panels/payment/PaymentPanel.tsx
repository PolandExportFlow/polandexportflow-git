'use client'

import React, { useMemo, useState } from 'react'
import { 
    CreditCard, 
    Wallet, 
    BadgeCheck, 
    Clock, 
    CheckCircle, 
    Truck,
    ShoppingBag,
    Banknote
} from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import { getOrderPaymentStatusConfig, type OrderPaymentStatus } from '@/utils/orderPaymentStatus'
import UniversalChoice from '@/components/ui/UniversalChoice'
import { getLogo } from '@/utils/getLogo'

import PaymentActionModal from './PaymentActionModal'
import PaymentSummary from './PaymentSummary'
import PaymentButtons from './PaymentButtons'

import type { PaymentPanelDB } from '../../clientOrderTypes'
import { useClientOrderModalCtx } from '../../ClientOrderModal.ctx'
import { usePayment } from '../../hooks/usePayment'

/* --- Subcomponents --- */
const ProductPaymentBox = ({ title, amount, icon, currency, variant }: any) => {
    const isGreen = variant === 'green'
    return (
        <div className={`flex gap-4 rounded-lg border p-4 mt-2 items-start cursor-default ${isGreen ? 'bg-[#D1FAE5] border-[#065F4666]' : 'bg-[#FFEDD5] border-[#9A341266]'}`}>
            <div className={`grid place-items-center h-11 w-10 shrink-0 rounded-lg ${isGreen ? 'bg-[#A7F3D0] text-[#065F46]' : 'bg-[#FED7AA] text-[#9A3412]'}`}>
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
            </div>
            <div className={isGreen ? 'text-[#065F46]' : 'text-[#9A3412]'}>
                <div className='text-[12px] mb-2 opacity-80'>{title}</div>
                <div className='text-[16px] font-heebo_medium tabular-nums'>{amount?.toFixed(2)} {currency}</div>
            </div>
        </div>
    )
}

/* --- Helpers --- */
const carrierKeyFromLabel = (label?: string) => {
    const raw = (label || '').toLowerCase().replace(/\s+/g, '')
    if (/poczta/.test(raw) || /polishpost/.test(raw)) return 'pocztapolska'
    return raw.replace(/[^a-z0-9]/g, '')
}

export default function PaymentPanel() {
    const { orderId, data, refreshSoft } = useClientOrderModalCtx()
    
    const pp = (data?.paymentPanel || (data as any)?.checkoutPanel) as PaymentPanelDB | undefined
    const orderType = data?.statusPanel?.order_type

    const safeData = pp || {
        payment_currency: 'PLN',
        payment_method_code: 'paypal',
        payment_status: 'none',
        payment_fee_pct: 0,
        order_total_items_value: 0,
        order_service_fee: 0,
        split_due: 0,
        split_received: 0,
        quotes: []
    } as unknown as PaymentPanelDB

    const payment = usePayment({ orderNumber: orderId, data: safeData })

    const [payOpen, setPayOpen] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState(0)

    // --- Metody płatności ---
    const methodOptions = useMemo(() => {
        const manualOptions: any[] = []
        let stripeOption: any[] = []

        payment.methods.forEach(m => {
            if (m.code === 'stripe') {
                const STRIPE_LOGOS = ['visa', 'mastercard', 'googlepay', 'applepay']
                    .map(k => getLogo('payment', k)).filter(Boolean)
                
                stripeOption = [{
                    value: 'stripe',
                    label: (
                        <span className='flex items-center gap-2'>
                            {STRIPE_LOGOS.map((src, i) => (
                                <img key={i} src={src} alt='' className='block object-contain h-[24px]' draggable={false} />
                            ))}
                        </span>
                    )
                }]
            } else {
                const src = getLogo('payment', m.code)
                manualOptions.push({
                    value: m.code,
                    label: (
                        <span className='flex items-center justify-start'>
                            {src ? <img src={src} alt={m.name} className='block object-contain h-5 md:h-4 max-w-[90px]' /> : m.name}
                        </span>
                    )
                })
            }
        })

        return { manualOptions, stripeOption }
    }, [payment.methods])

    const hasAnyPaymentMethod = methodOptions.manualOptions.length > 0 || methodOptions.stripeOption.length > 0

    if (!pp) return null

    const showProductFields = orderType !== 'Parcel Forwarding'
    
    const shippingOptions = (pp.quotes || []).map(q => {
        const key = carrierKeyFromLabel(q.quote_carrier || '')
        const logo = getLogo('carrier', key)
        const price = payment.fromPLN(Number(q.quote_carrier_fee || 0))
        return {
            value: String(q.id),
            label: (
                <div className='w-full pointer-events-none flex flex-col gap-2 pr-4'>
                    <div className='flex items-center gap-3'>
                        {logo ? <img src={logo} alt='' className='h-5 max-w-[100px] object-contain' /> : <span className='w-10'/>}
                        <span className='text-[14px] font-medium'>{q.quote_carrier}</span>
                        <span className='text-[14px] opacity-60'>({payment.format(price)})</span>
                    </div>
                    {q.quote_delivery_days && (
                        <div className='flex items-center gap-1.5 text-[12px] opacity-70 ml-12'>
                            <Clock className='w-3 h-3' /> {q.quote_delivery_days} days
                        </div>
                    )}
                </div>
            )
        }
    })

    const currencyOptions = ['PLN', 'EUR', 'USD', 'GBP'].map(c => ({
        value: c,
        label: <div className='flex items-center gap-2'><Wallet className='w-4 h-4 opacity-50'/> {c}</div>
    }))

    return (
        <>
            <UniversalDetail
                title='Payment'
                icon={<CreditCard className='h-5 w-5' />}
                collapsible
                defaultOpen={false}
                defaultOpenMobile={false}
                className='bg-white border-light-blue'
            >
                {/* ✅ 1. PAYMENT STATUS ZAWSZE NA GÓRZE */}
                {pp.payment_status !== 'none' && (
                    <DetailRow 
                        icon={<BadgeCheck className='w-3.5 h-3.5'/>} 
                        label='Payment status' 
                        value={<UniversalStatusBadge status={pp.payment_status as OrderPaymentStatus} getConfig={getOrderPaymentStatusConfig}/>} 
                        className='!border-b-0 mb-4'
                    />
                )}

                {showProductFields && (
                    <div className='mt-2 mb-6 bg-ds-light-blue rounded-md p-4 md:p-5'>
                        {/* ✅ LABEL: Products Payment */}
                        <div className='flex items-start gap-2 mb-3 min-h-[20px] text-middle-blue/80'>
                            <ShoppingBag className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                            <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                                Products Payment
                            </span>
                        </div>
                        
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                            <ProductPaymentBox title='Products Due' amount={pp.split_due} icon={<Clock/>} currency={payment.currency} variant='orange'/>
                            <ProductPaymentBox title='Products Paid' amount={pp.split_received} icon={<CheckCircle/>} currency={payment.currency} variant='green'/>
                        </div>
                    </div>
                )}

                <div className='mt-2 mb-6 bg-ds-light-blue rounded-md p-4 md:p-5'>
                    {/* ✅ LABEL: Shipping Method */}
                    <div className='flex items-start gap-2 mb-3 min-h-[20px] text-middle-blue/80'>
                        <Truck className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                        <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                            Shipping Method
                        </span>
                    </div>

                    {shippingOptions.length > 0 ? (
                        <UniversalChoice
                            value={payment.selectedQuoteId || undefined}
                            onChange={async v => { await payment.saveQuote(v as string); refreshSoft(); }}
                            options={shippingOptions}
                            cols={{ base: 1 }}
                            size='lg'
                            showSelectionDot
                        />
                    ) : <div className='text-sm opacity-60 p-2'>No shipping quotes yet.</div>}
                </div>

                <div className='grid grid-cols-1 gap-6'>
                    <div className='bg-ds-light-blue rounded-md p-4 md:p-5'>
                        {/* ✅ LABEL: Currency */}
                        <div className='flex items-start gap-2 mb-3 min-h-[20px] text-middle-blue/80'>
                            <Banknote className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                            <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                                Currency
                            </span>
                        </div>

                        <UniversalChoice
                            value={payment.currency}
                            onChange={async v => { await payment.setCurrency(v as string); refreshSoft(); }}
                            options={currencyOptions}
                            cols={{ base: 2 }}
                            size='sm'
                        />
                    </div>
                    
                    <div className='bg-ds-light-blue rounded-md p-4 md:p-5'>
                        {/* ✅ LABEL: Payment Method */}
                        <div className='flex items-start gap-2 mb-3 min-h-[20px] text-middle-blue/80'>
                            <CreditCard className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                            <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                                Payment Method
                            </span>
                        </div>

                        {hasAnyPaymentMethod ? (
                            <div className='flex flex-col gap-2'>
                                {methodOptions.manualOptions.length > 0 && (
                                    <UniversalChoice
                                        value={payment.method?.code}
                                        onChange={async v => { await payment.setMethod(v as string); refreshSoft(); }}
                                        options={methodOptions.manualOptions}
                                        cols={{ base: 1, sm: 2 }}
                                        size='md'
                                    />
                                )}
                                {methodOptions.stripeOption.length > 0 && (
                                    <UniversalChoice
                                        value={payment.method?.code}
                                        onChange={async v => { await payment.setMethod(v as string); refreshSoft(); }}
                                        options={methodOptions.stripeOption}
                                        cols={{ base: 1 }}
                                        size='md'
                                    />
                                )}
                            </div>
                        ) : (
                            <div className='text-sm opacity-60 p-2'>No payment methods available.</div>
                        )}
                    </div>
                </div>

                {/* ✅ 3. JEDYNY HR PRZED PODSUMOWANIEM I PRZYCISKAMI */}
                <hr className='my-6 border-light-blue/50'/>

                {/* SERVICE RECEIPT NA DOLE (nad przyciskami) */}
                <div className='mt-4 mb-6'>
                    <PaymentSummary
                        currency={payment.currency}
                        breakdown={payment.breakdown}
                        fromPLN={payment.fromPLN}
                        format={payment.format}
                        methodKey={payment.method?.code || 'paypal'}
                        effectiveQuote={(pp.quotes || []).find(q => String(q.id) === String(payment.selectedQuoteId))}
                    />
                </div>

                <PaymentButtons
                    orderNumber={orderId}
                    showProductFields={showProductFields}
                    productsAmount={payment.fromPLN(payment.breakdown.productsPLN)}
                    serviceAmount={payment.fromPLN(payment.breakdown.shippingPLN + payment.breakdown.serviceFeePLN)}
                    totalAmount={payment.breakdown.total}
                    payment={payment}
                    onOpenModal={(amt) => { setPaymentAmount(amt); setPayOpen(true); }}
                />

            </UniversalDetail>

            <PaymentActionModal
                isOpen={payOpen}
                onClose={() => setPayOpen(false)}
                orderNumber={orderId}
                amount={paymentAmount}
                currency={payment.currency}
                method={payment.method?.code || 'paypal'}
                onStripeRedirect={() => alert('Redirecting to Stripe...')}
            />
        </>
    )
}