'use client'

import React from 'react'
import OrdersListWidget from './OrdersListWidget'
import { useOrdersListWidget } from './useOrdersListWidget'
import ClientOrderModal from '../common/ClientOrderModal/ClientOrderModal'
import { useClientOrderModal } from '../common/ClientOrderModal/useClientOrderModal'

export default function OrdersListWidgetConnected() {
    const { orders, loading, error, modalOrderId, openOrder, closeOrder, refresh: refreshList } = useOrdersListWidget(5)

    const { loading: modalLoading, refreshing, refresh: refreshModal } = useClientOrderModal(modalOrderId)

    const handleOrderClosed = () => {
        closeOrder()
        void refreshList()
    }

    return (
        <div className='relative'>
            <OrdersListWidget orders={orders} onOpenOrder={openOrder} onViewAll={() => console.log('View all clicked')} />

            <ClientOrderModal
                isOpen={!!modalOrderId}
                orderId={modalOrderId || ''}
                onClose={closeOrder}
                onUpdated={() => {
                    void refreshModal()
                    void refreshList()
                }}
                onOrderDeleted={handleOrderClosed}
                showLoadError={true} 
            />

            {(loading || modalLoading) && (
                <div className='absolute top-2 right-3 text-[12px] text-middle-blue/70'>Loading…</div>
            )}

            {error && <div className='mt-2 text-[12px] text-red'>{error}</div>}
        </div>
    )
}