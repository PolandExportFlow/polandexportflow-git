'use client'

import React, { useCallback, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import { FileBox, RefreshCcw } from 'lucide-react'
import UniversalSkel from '@/components/ui/UniversalSkel'

import { ClientOrderModalProvider, useClientOrderModalCtx } from './ClientOrderModal.ctx'
import { useOrderData } from './hooks/useOrderData'
import { useOrderUI } from './hooks/useOrderUI'

import StatusPanel from './panels/StatusPanel'
import TrackingPanel from './panels/TrackingPanel'
import ItemsListPanel from './panels/itemsList/ItemsListPanel'
import AddressPanelClient from './panels/AddressPanel'
import WarehouseAddressPanel from './panels/WarehouseAddressPanel'
import PaymentPanel from './panels/payment/PaymentPanel'

type Props = Omit<React.ComponentProps<typeof Modal>, 'children' | 'title' | 'icon' | 'actions'> & {
    orderId: string
    title?: string
    showLoadError?: boolean
    onUpdated?: () => void
    onOrderDeleted?: () => void
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
    // 1. Pobieranie danych (zawsze trimuj orderId dla bezpieczeństwa)
    const cleanOrderId = (orderId || '').trim()
    const m = useOrderData(cleanOrderId, isOpen)
    
    // 2. Logika UI
    const ui = useOrderUI(m.data)

    // 3. Refresh
    const handleRefresh = useCallback(async () => {
        await m.refresh()
        onUpdated?.()
    }, [m.refresh, onUpdated])

    // 4. Budowa Contextu
    const providerValue = useMemo(() => ({
        orderId: cleanOrderId,
        data: m.data,
        ui,
        onOrderDeleted,
        refresh: handleRefresh,
        refreshSoft: () => m.refreshSoft(),
        addLocalItem: m.addLocalItem,
        replaceLocalItem: m.replaceLocalItem,
        updateLocalItem: m.updateLocalItem,
        removeLocalItem: m.removeLocalItem,
        updateLocalAddress: m.updateLocalAddress,
    }), [cleanOrderId, m.data, ui, onOrderDeleted, handleRefresh, m.refreshSoft, m.addLocalItem, m.replaceLocalItem, m.updateLocalItem, m.removeLocalItem, m.updateLocalAddress])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size='lg'
            panelWidth='min(98vw, 2000px)'
            panelMaxHeight='98dvh'
            title={
                <span className='tracking-wide'>
                    {title} <span className='opacity-60'>#{m.data?.statusPanel?.order_number ?? cleanOrderId.replace(/^#/, '')}</span>
                </span>
            }
            icon={<FileBox className='h-4 w-4 md:h-5 md:w-5' />}
            actions={
                <button
                    onClick={() => void handleRefresh()}
                    className='inline-flex h-7 w-7 items-center justify-center rounded-md text-middle-blue hover:bg-middle-blue/10 disabled:opacity-40'
                    title='Refresh'
                    disabled={m.refreshing}>
                    <RefreshCcw className={`h-3 w-3 ${m.refreshing ? 'animate-spin' : ''}`} />
                </button>
            }
            {...rest}>
            
            {m.loading ? (
                <div className='flex flex-col gap-4'>
                    {/* Row 1 */}
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
                        <UniversalSkel h={64} className="rounded-lg" />
                        <UniversalSkel h={64} className="rounded-lg" />
                    </div>
                    {/* Row 2 */}
                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-start'>
                        <UniversalSkel h={64} className="rounded-lg" />
                        <UniversalSkel h={64} className="rounded-lg" />
                        <UniversalSkel h={64} className="rounded-lg" />
                    </div>
                    {/* Row 3 */}
                    <UniversalSkel h={400} className="rounded-lg" />
                </div>
            ) : !m.data ? (
                showLoadError ? (
                    <div className='mb-4 rounded-lg border border-red/30 bg-red/5 p-4 text-sm'>
                        Failed to load order data. {m.error || 'Unknown error'}
                    </div>
                ) : null
            ) : (
                <ClientOrderModalProvider value={providerValue}>
                    <ModalLayout />
                </ClientOrderModalProvider>
            )}
        </Modal>
    )
}

function ModalLayout() {
    const { ui } = useClientOrderModalCtx()

    // Ukrywamy dziurę po trackingu
    const row2GridClass = ui.showTracking 
        ? 'grid grid-cols-1 lg:grid-cols-3 gap-4 items-start' 
        : 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'

    return (
        <div className='flex flex-col gap-4 font-heebo_regular'>
            
            {/* --- ROW 1 --- */}
            <div className={`grid grid-cols-1 ${ui.showPayment ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4 items-start`}>
                <div className='min-w-0'>
                    <StatusPanel />
                </div>
                {ui.showPayment && (
                    <div className='min-w-0'>
                        <PaymentPanel />
                    </div>
                )}
            </div>

            {/* --- ROW 2 --- */}
            <div className={row2GridClass}>
                {ui.showTracking && (
                    <div className='min-w-0'>
                        <TrackingPanel />
                    </div>
                )}
                {ui.showWarehouseAddr && (
                    <div className='min-w-0'>
                        <WarehouseAddressPanel />
                    </div>
                )}
                <div className='min-w-0'>
                    <AddressPanelClient />
                </div>
            </div>

            {/* --- ROW 3 --- */}
            <div className='min-w-0'>
                <ItemsListPanel />
            </div>

        </div>
    )
}