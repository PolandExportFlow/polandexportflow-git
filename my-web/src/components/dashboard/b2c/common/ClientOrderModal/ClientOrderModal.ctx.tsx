'use client'

import React, { createContext, useContext } from 'react'
import type { ClientOrderModalPayload, AddressPanelDB, ItemsPanelRowDB } from './clientOrderTypes'
import type { OrderUI } from './hooks/useOrderUI'

export type ItemRow = ItemsPanelRowDB

export type ClientOrderModalCtxValue = {
    orderId: string
    data: ClientOrderModalPayload | null
    ui: OrderUI
    
    // ✅ DODANE: Funkcja do zamykania modala po usunięciu
    onOrderDeleted?: () => void

    refresh: () => Promise<void> | void
    refreshSoft: () => Promise<void> | void
    addLocalItem?: (row: ItemRow) => void
    replaceLocalItem?: (tempId: string, realRow: ItemRow) => void
    updateLocalItem?: (itemId: string, patch: Partial<ItemRow>) => void
    removeLocalItem?: (itemId: string) => void
    updateLocalAddress?: (patch: Partial<AddressPanelDB>) => void
}

// Domyślne wartości
const DEFAULT_UI: OrderUI = {
    canEdit: false, canSubmit: false, canUnsubmit: false,
    showPayment: false, showTracking: false, showWarehouseAddr: false, isSubmitted: false
}

const ClientOrderModalCtx = createContext<ClientOrderModalCtxValue>({
    orderId: '',
    data: null,
    ui: DEFAULT_UI,
    onOrderDeleted: undefined, // ✅ Default
    refresh: () => {},
    refreshSoft: () => {},
    addLocalItem: undefined,
    replaceLocalItem: undefined,
    updateLocalItem: undefined,
    removeLocalItem: undefined,
    updateLocalAddress: undefined,
})

export const ClientOrderModalProvider = ClientOrderModalCtx.Provider
export const useClientOrderModalCtx = () => useContext(ClientOrderModalCtx)