'use client'

import React from 'react'
import OrdersListWidget from './OrdersListWidget'
import { useOrdersListWidget } from './useOrdersListWidget'
import ClientOrderModal from '../common/ClientOrderModal/ClientOrderModal'

export default function OrdersListWidgetConnected() {
    const { orders, loading, error, modalOrderId, openOrder, closeOrder, refresh: refreshList } = useOrdersListWidget(5)

    const handleOrderClosed = () => {
        // 1. Najpierw zamknij modal (UX: natychmiastowa reakcja)
        closeOrder()
        // 2. Potem odśwież listę (żeby usunięte zniknęło)
        void refreshList()
    }

    return (
        <div className='relative'>
            <OrdersListWidget 
                orders={orders} 
                onOpenOrder={openOrder} 
                onViewAll={() => console.log('View all clicked')} 
            />

            <ClientOrderModal
                isOpen={!!modalOrderId}
                orderId={modalOrderId || ''}
                onClose={closeOrder}
                onUpdated={() => {
                    // Odświeżenie listy po zmianach wewnątrz modala (np. zmiana statusu)
                    void refreshList()
                }}
                onOrderDeleted={handleOrderClosed} // 🛑 Tutaj podpinamy naszą funkcję zamykającą
                showLoadError={true} 
            />

            {loading && (
                <div className='absolute top-2 right-3 text-[12px] text-middle-blue/70'>Loading…</div>
            )}

            {error && <div className='mt-2 text-[12px] text-red'>{error}</div>}
        </div>
    )
}