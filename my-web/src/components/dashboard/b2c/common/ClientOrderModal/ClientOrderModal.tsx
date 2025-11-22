'use client'

import React, { useMemo, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import { FileBox, RefreshCcw } from 'lucide-react'

import StatusPanel from './panels/StatusPanel'
import TrackingPanel from './panels/TrackingPanel'
import ItemsListPanel from './panels/ItemsListPanel'
import AddressPanelClient from './panels/AddressPanel'
import CheckoutPanel from './panels/checkout/CheckoutPanel'
import UniversalSkel from '@/components/ui/UniversalSkel'
import WarehouseAddressPanel from './panels/WarehouseAddressPanel'

import { useClientOrderModal } from './useClientOrderModal'
import { ClientOrderModalProvider } from './ClientOrderModal.ctx'

import { useStatus } from './hooks/useStatus'
import { useAddress } from './hooks/useAddress'
import { useItems } from './hooks/useItems'

import type { ClientOrderModalPayload, Currency, MethodCode } from './clientOrderTypes'

type Props = Omit<React.ComponentProps<typeof Modal>, 'children' | 'title' | 'icon' | 'actions'> & {
    orderId: string
    title?: string
    showLoadError?: boolean
    onUpdated?: () => void
    onOrderDeleted?: () => void
}

function mapCheckoutDBtoUI(cp: ClientOrderModalPayload['checkoutPanel']) {
    const quotes = cp.quotes ?? []
    const selected = quotes.find(q => q.selected)
    const shipping = selected?.quote_carrier_fee ?? 0

    const asCurrency = (v: string | null | undefined) => {
        const x = String(v || 'PLN').toUpperCase()
        return (['PLN', 'EUR', 'USD', 'GBP'] as const).includes(x as any) ? (x as Currency) : 'PLN'
    }
    const asMethodCode = (v: string | null | undefined) => {
        const x = String(v || 'paypal').toLowerCase()
        return (['paypal', 'wise', 'revolut', 'zen'] as const).includes(x as any) ? (x as MethodCode) : 'paypal'
    }

    const methodLc = asMethodCode(cp.payment_method_code)

    return {
        currency: asCurrency(cp.payment_currency),
        method: methodLc,
        methodCode: methodLc,
        status: cp.payment_status,
        paymentFeePct: cp.payment_fee_pct ?? 0,
        summary: {
            products: cp.order_total_items_value ?? 0,
            shipping,
            serviceFee: cp.order_service_fee ?? 0,
        },
        quotes,
        splitDue: cp.split_due ?? 0,
        splitReceived: cp.split_received ?? 0,
    }
}

export default function ClientOrderModal({
    orderId,
    title = 'Order',
    isOpen,
    onClose,
    showLoadError = false,
    onUpdated,
    onOrderDeleted,
    ...rest
}: Props) {
    const m = useClientOrderModal(orderId, Boolean(orderId))
    const mp = m.modalProps

    const [refreshingLocal, setRefreshingLocal] = useState(false)
    const anyRefreshing = refreshingLocal || m.refreshing

    const storagePrefix = mp?.statusPanel?.order_number || ''
    const checkoutUi = useMemo(() => (mp ? mapCheckoutDBtoUI(mp.checkoutPanel) : null), [mp])
    const trackingItems = useMemo(() => (mp?.trackingPanel ? [mp.trackingPanel] : []), [mp])

    const handleRefresh = useCallback(async () => {
        setRefreshingLocal(true)
        try {
            await m.refresh()
            onUpdated?.()
        } finally {
            setTimeout(() => setRefreshingLocal(false), 250)
        }
    }, [m.refresh, onUpdated])

    const providerValue = useMemo(
        () => ({
            orderId,
            data: m.data,
            refresh: handleRefresh,
            refreshSoft: () => m.refreshSoft?.(),
            addLocalItem: m.addLocalItem,
            replaceLocalItem: m.replaceLocalItem,
            updateLocalItem: m.updateLocalItem,
            removeLocalItem: m.removeLocalItem,
            updateLocalAddress: m.updateLocalAddress,
            getCheckoutUI: () => checkoutUi,
        }),
        [
            orderId,
            m.data,
            handleRefresh,
            m.refreshSoft,
            m.addLocalItem,
            m.replaceLocalItem,
            m.updateLocalItem,
            m.removeLocalItem,
            m.updateLocalAddress,
            checkoutUi,
        ]
    )

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size='lg'
            panelWidth='min(98vw, 2000px)'
            panelMaxHeight='98dvh'
            title={
                <span className='tracking-wide'>
                    {title} <span className='opacity-60'>#{mp?.statusPanel?.order_number ?? orderId}</span>
                </span>
            }
            icon={<FileBox className='h-4 w-4 md:h-5 md:w-5' />}
            actions={
                <button
                    onClick={() => void handleRefresh()}
                    className='inline-flex h-7 w-7 items-center justify-center rounded-md text-middle-blue hover:bg-middle-blue/10 disabled:opacity-40'
                    title='Refresh'
                    aria-label='Refresh'
                    disabled={anyRefreshing}>
                    <RefreshCcw className={`h-3 w-3 ${anyRefreshing ? 'animate-spin' : ''}`} />
                </button>
            }
            {...rest}>
            {m.loading ? (
                <div className='grid gap-4 lg:grid-cols-3'>
                    <UniversalSkel h={400} />
                    <UniversalSkel h={500} />
                    <div className='hidden lg:flex flex-col gap-4'>
                        <UniversalSkel h={400} />
                        <UniversalSkel h={150} />
                    </div>
                    <div className='lg:col-span-3'>
                        <UniversalSkel h={300} />
                    </div>
                </div>
            ) : !mp ? (
                <>
                    {showLoadError ? (
                        <div className='mb-4 rounded-lg border border-red/30 bg-red/5 p-4 text-sm'>
                            Failed to load order data for ID:&nbsp;<b>{orderId}</b>. {m.error ? `(${m.error})` : null}
                        </div>
                    ) : null}
                </>
            ) : (
                <ClientOrderModalProvider value={providerValue}>
                    <ModalContent
                        lookup={orderId}
                        storagePrefix={storagePrefix}
                        payload={mp}
                        trackingItems={trackingItems}
                        onUpdated={onUpdated}
                        onOrderDeleted={onOrderDeleted}
                        onCloseModal={onClose}
                    />
                </ClientOrderModalProvider>
            )}
        </Modal>
    )
}

function ModalContent({
    lookup,
    storagePrefix,
    payload,
    trackingItems,
    onUpdated,
    onOrderDeleted,
    onCloseModal,
}: {
    lookup: string
    storagePrefix: string
    payload: ClientOrderModalPayload
    trackingItems: NonNullable<ClientOrderModalPayload['trackingPanel']>[]
    onUpdated?: () => void
    onOrderDeleted?: () => void
    onCloseModal?: () => void
}) {
    const { setOrderNote, deleteOrder, addAttachments, deleteAttachment } = useStatus()
    const { updateAddress, loadAndSetDefaultAddress } = useAddress()
    const { addItem, updateItem, deleteItem, addImages, removeImages } = useItems()

    return (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4 font-heebo_regular'>
            <div className='min-w-0 self-start flex flex-col gap-3'>
                <StatusPanel
                    order_status={payload.statusPanel.order_status}
                    order_number={payload.statusPanel.order_number}
                    order_type={payload.statusPanel.order_type ?? null}
                    order_note={payload.statusPanel.order_note ?? undefined}
                    files={payload.statusPanel.files ?? []}
                    onSaveNote={note => setOrderNote(lookup, note)}
                    onAddFiles={files => addAttachments(lookup, files)}
                    onDeleteAttachment={file => deleteAttachment(file)} // 🛑 PRZEKAZUJEMY CAŁY PLIK
                    onDeleteOrder={async () => {
                        await deleteOrder(lookup)
                        onOrderDeleted?.()
                    }}
                    canDeleteOrder={useMemo(
                        () => payload.statusPanel.order_status === 'created',
                        [payload.statusPanel.order_status]
                    )}
                />
            </div>

            <div className='min-w-0 self-start flex flex-col gap-3'>
                <CheckoutPanel
                    orderNumber={payload.statusPanel.order_number || lookup}
                    checkout={payload.checkoutPanel}
                    orderType={payload.statusPanel.order_type ?? null}
                    fxRates={{}}
                    paymentFees={{}}
                />
            </div>

            <div className='min-w-0 self-start flex flex-col gap-3'>
                <WarehouseAddressPanel />
                <AddressPanelClient
                    address={payload.addressPanel}
                    onUpsertAddress={patch => updateAddress(lookup, patch)}
                    onUseDefaultAddress={() => loadAndSetDefaultAddress(lookup)}
                    canEdit={payload.statusPanel.order_status === 'created'}
                />
                <TrackingPanel items={trackingItems} />
            </div>

            <div className='min-w-0 self-start lg:col-span-3'>
                <ItemsListPanel
                    items={payload.itemsPanel}
                    onAddItem={() => addItem(lookup)}
                    onUpdateItem={(id, patch) => updateItem(lookup, id, patch)}
                    onDeleteItem={id => deleteItem(lookup, id)}
                    onAddImages={async (id, fileList) => {
                        await addImages(lookup, id, Array.from(fileList))
                        onUpdated?.()
                    }}
                    onRemoveImage={async (id, imgId) => {
                        await removeImages(lookup, id, [String(imgId)])
                        onUpdated?.()
                    }}
                    onThumbClick={() => {}}
                />
            </div>
        </div>
    )
}