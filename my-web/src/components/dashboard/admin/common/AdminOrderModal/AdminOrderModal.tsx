// app/admin/components/sections/orders/AdminOrderModal.tsx
'use client'

import React, { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FileBox, RefreshCcw } from 'lucide-react'
import ItemsPanel from './panels/ItemsPanel/ItemsPanel'
import UniversalNote from '@/components/ui/UniversalNote'
import UniversalSkel from '@/components/ui/UniversalSkel'
import type { PaymentBlock, ShippingQuote, AddressBlock, StatusBlock, PaymentSummary } from './AdminOrderTypes'
import PaymentPanel from './panels/PaymentPanel/PaymentPanel'
import AddressPanel from './panels/AddressPanel/AddressPanel'
import StatusPanel from './panels/StatusPanel/StatusPanel'
import { useOrderModal } from './hooks/useOrderModal'
import { useQuotes } from './hooks/useQuotes'
import { useAddress } from './hooks/useAddress'

const carrierKeyFromLabel = (label: string) => {
    const raw = (label || '').toLowerCase().trim()
    if (/poczta\s*polska|polish\s*post/.test(raw)) return 'pocztapolska'
    return raw.replace(/[^a-z0-9]/g, '')
}

const EMPTY_ADDRESS: AddressBlock = {
    order_fullname: null,
    order_email: null,
    order_phone: null,
    order_country: null,
    order_city: null,
    order_postal_code: null,
    order_street: null,
    order_delivery_notes: null,
    order_house_number: null,
}

type AdminModalProps = Omit<React.ComponentProps<typeof Modal>, 'children' | 'title' | 'icon' | 'actions'> & {
    orderId: string
    title?: string
    itemsList?: React.ReactNode
}

export default function AdminOrderModal({
    orderId,
    title = 'Zamówienie',
    isOpen,
    onClose,
    itemsList,
    ...rest
}: AdminModalProps) {
    // `m` zawiera teraz wszystko
    const m = useOrderModal(orderId)

    const lookup = m.status?.order_number || ''
    const addr = useAddress(lookup)
    const effectiveOrderId = m.status?.order_id || m.status?.id || orderId
    const quotesHook = useQuotes(effectiveOrderId)
    const safeQuotes: ShippingQuote[] = (quotesHook.quotes ?? []) as ShippingQuote[]

    // Obliczamy koszt wysyłki tylko dla `AddressPanel`
    const shippingCostForAddress = (m.payment?.total_subtotal || 0) - (m.payment?.total_items_value || 0)

    const acceptedQuote =
        safeQuotes.find(q => String(q.quote_status || '').toLowerCase() === 'accepted') ||
        safeQuotes.find(q => !!q.is_selected)
    const acceptedCarrier = acceptedQuote
        ? { name: acceptedQuote.quote_carrier, key: carrierKeyFromLabel(acceptedQuote.quote_carrier) }
        : null

    const anyRefreshing = m.refreshing || quotesHook.refreshing || addr.refreshing

    const [localRefreshing, setLocalRefreshing] = useState(false)
    const spinning = anyRefreshing || localRefreshing
    const MIN_SPIN_TIME = 300

    const handleRefresh = async () => {
        setLocalRefreshing(true)
        const startTime = Date.now()
        // `m.refresh` odświeża teraz wszystko (w tym płatności)
        await Promise.all([m.refresh(), quotesHook.refresh(), addr.refresh()])
        const elapsed = Date.now() - startTime
        const delayTime = Math.max(0, MIN_SPIN_TIME - elapsed)
        if (delayTime > 0) {
            await new Promise(resolve => setTimeout(resolve, delayTime))
        }
        setLocalRefreshing(false)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size='lg'
            panelWidth='min(98vw, 2400px)'
            panelMaxHeight='98dvh'
            title={
                <span className='tracking-wide'>
                    {title} {m.status?.order_number ? <span className='opacity-60'>#{m.status.order_number}</span> : null}
                </span>
            }
            icon={<FileBox className='h-4 w-4 md:h-5 md:w-5' />}
            actions={
                <button
                    onClick={handleRefresh}
                    className='inline-flex h-11 w-11 items-center justify-center rounded-md text-middle-blue hover:bg-middle-blue/10 disabled:opacity-40'
                    title='Odśwież'
                    aria-label='Odśwież'
                    disabled={spinning}>
                    <RefreshCcw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
                </button>
            }
            {...rest}>
            {m.loading ? (
                <div className='grid gap-4 lg:grid-cols-2 2xl:grid-cols-3'>
                    <div className='flex flex-col gap-4'>
                        <UniversalSkel h={300} />
                        <UniversalSkel h={200} />
                    </div>
                    <div className='flex flex-col gap-4'>
                        <UniversalSkel h={300} />
                        <UniversalSkel h={220} />
                    </div>
                    <div className='hidden 2xl:flex flex-col gap-4'>
                        <UniversalSkel h={280} />
                        <UniversalSkel h={220} />
                    </div>
                    <div className='lg:col-span-2 2xl:col-span-3'>
                        <UniversalSkel h={280} />
                    </div>
                </div>
            ) : !m.status || !m.status.order_number ? (
                <>
                    <div className='rounded-lg border border-red/30 bg-red/5 p-4 text-sm mb-4'>
                        Błąd ładowania danych zamówienia dla ID: <b>{orderId}</b>.
                    </div>
                    <div className='grid gap-4 lg:grid-cols-2 2xl:grid-cols-3'>
                        <div className='flex flex-col gap-4'>
                            <UniversalSkel h={300} />
                            <UniversalSkel h={200} />
                        </div>
                        <div className='flex flex-col gap-4'>
                            <UniversalSkel h={300} />
                            <UniversalSkel h={220} />
                        </div>
                        <div className='hidden 2xl:flex flex-col gap-4'>
                            <UniversalSkel h={280} />
                            <UniversalSkel h={220} />
                        </div>
                        <div className='lg:col-span-2 2xl:col-span-3'>
                            <UniversalSkel h={280} />
                        </div>
                    </div>
                </>
            ) : (
                <div className='grid gap-2 lg:gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 font-heebo_regular'>
                    <div className='flex flex-col gap-2 lg:gap-3 self-start'>
                        <StatusPanel
                            overview={m.status}
                            attachments={m.attachments}
                            onChangeStatus={s => void m.changeStatus(s)}
                            onChangeSource={s => void m.changeSource(s)}
                            onAddFiles={files => void m.addFiles(files)}
                            onDeleteAttachment={f => void m.deleteAttachment(f)}
                            onRefresh={handleRefresh}
                            orderNote={m.orderNote}
                            onSaveOrderNote={note => void m.saveOrderNote(note)}
                        />

                        <UniversalNote
                            title='Notatka administracyjna'
                            targetId={m.status?.order_id || m.status?.order_number || orderId}
                            initialNote={m.adminNote}
                            onSave={async (_id, note) => {
                                const updated = await m.saveAdminNote(note)
                                return updated as unknown as string | void
                            }}
                        />
                    </div>

                    <div className='flex flex-col gap-2 lg:gap-3 self-start'>
                        <PaymentPanel
                            payHook={m}
                            quotes={safeQuotes}
                            orderId={String(effectiveOrderId)}
                            onCreateQuotes={(id, rows, days) => quotesHook.createQuotes(rows, days, id)}
                            onDeleteQuote={id => void quotesHook.removeQuote(id)}
                        />
                    </div>

                    <div className='flex flex-col gap-2 lg:gap-3 self-start lg:col-start-2 2xl:col-start-3'>
                        
                        <AddressPanel
                            orderLookup={lookup}
                            address={addr.address} 
                            carrier={acceptedCarrier}
                            trackingCode={m.status?.selected_tracking_link || ''}
                            quotedShippingPLN={shippingCostForAddress}
                            onUpsertAddress={addr.upsertAddress}
                        />

                    </div>

                    <div className='lg:col-span-2 2xl:col-span-3 self-start'>
                        <ItemsPanel
                            orderId={m.status?.order_id || orderId}
                            orderNumber={m.status?.order_number || ''}
                            items={m.items}
                        />
                    </div>
                </div>
            )}
        </Modal>
    )
}