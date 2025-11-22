'use client'

import React, { createContext, useContext } from 'react'
import type {
    ClientOrderModalPayload,
    AddressPanelDB,
    Currency,
    MethodCode,
} from './clientOrderTypes'

export type ItemRow = ClientOrderModalPayload['itemsPanel'][number]

export type CheckoutPanelUI = {
    currency: Currency
    method: MethodCode
    methodCode: MethodCode
    status: string | null
    paymentFeePct: number | null
    summary: { products: number; shipping: number; serviceFee: number }
    quotes: ClientOrderModalPayload['checkoutPanel']['quotes']
}

export type ClientOrderModalCtxValue = {
    orderId: string
    data: ClientOrderModalPayload | null
    refresh: () => Promise<void> | void
    refreshSoft?: () => Promise<void> | void
    addLocalItem?: (row: ItemRow) => void
    replaceLocalItem?: (tempId: string, realRow: ItemRow) => void
    updateLocalItem?: (itemId: string, patch: Partial<ItemRow>) => void
    removeLocalItem?: (itemId: string) => void
    updateLocalAddress?: (patch: Partial<AddressPanelDB>) => void
    getCheckoutUI?: () => CheckoutPanelUI | null
}

const ClientOrderModalCtx = createContext<ClientOrderModalCtxValue>({
    orderId: '',
    data: null,
    refresh: () => {},
    refreshSoft: undefined,
    addLocalItem: undefined,
    replaceLocalItem: undefined,
    updateLocalItem: undefined,
    removeLocalItem: undefined,
    updateLocalAddress: undefined,
    getCheckoutUI: undefined,
})

export const ClientOrderModalProvider = ClientOrderModalCtx.Provider
export const useClientOrderModalCtx = () => useContext(ClientOrderModalCtx)