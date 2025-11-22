// app/admin/components/sections/orders/hooks/useAddress.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    adminFetchAddressByLookup,
    adminUpdateAddress, // Używamy tej funkcji
} from '@/components/dashboard/admin/common/AdminOrderModal/panels/AddressPanel/address.service'
import { AddressBlock } from '../AdminOrderTypes'

type State = {
    loading: boolean
    refreshing: boolean
    address: AddressBlock | null
    buildingNo: string | null
    courierText: string
    deliveryNotes: string // To jest teraz w `address`, ale zostawmy dla spójności fetch
}

/**
 * Hook sekcji Adresu w modalu.
 */
export function useAddress(orderLookup: string) {
    const [s, setS] = useState<State>({
        loading: true,
        refreshing: false,
        address: null,
        buildingNo: null,
        courierText: '',
        deliveryNotes: '',
    })

    const hasLookup = Boolean(orderLookup && orderLookup.trim().length > 0)

    const fetchOnce = useCallback(async () => {
        if (!hasLookup) {
            setS({
                loading: false,
                refreshing: false,
                address: null,
                buildingNo: null,
                courierText: '',
                deliveryNotes: '',
            })
            return
        }

        setS(prev => ({ ...prev, loading: true }))
        try {
            const res = await adminFetchAddressByLookup(orderLookup)
            setS(prev => ({
                ...prev,
                loading: false,
                refreshing: false,
                address: res.address,
                buildingNo: res.buildingNo,
                courierText: res.courierText,
                deliveryNotes: res.deliveryNotes,
            }))
        } catch (e) {
            console.error('[useAddress] fetchOnce error:', e)
            setS(prev => ({ ...prev, loading: false, refreshing: false }))
        }
    }, [hasLookup, orderLookup])

    useEffect(() => {
        void fetchOnce()
    }, [fetchOnce])

    const refresh = useCallback(async () => {
        if (!hasLookup) {
            setS(prev => ({ ...prev, refreshing: false }))
            return
        }
        setS(prev => ({ ...prev, refreshing: true }))
        try {
            await fetchOnce()
        } finally {
            // fetchOnce sam ustawi refreshing na false
        }
    }, [hasLookup, fetchOnce])

    /**
     * NOWA FUNKCJA: Zapisuje patch (np. jedno pole) i odświeża stan.
     * Komponent (AddressPanel) zajmie się optymistyczną aktualizacją UI.
     */
    const upsertAddress = useCallback(
        async (patch: Partial<AddressBlock>) => {
            if (!hasLookup) return

            // Komponent robi optimistic update, my tylko wysyłamy
            try {
                await adminUpdateAddress(orderLookup, patch)
                // Po sukcesie, musimy odświeżyć dane, aby hook miał aktualną prawdę
                // i aby np. courierText się przeliczył
                await fetchOnce()
            } catch (e) {
                console.error('[useAddress] upsertAddress error:', e)
                // W razie błędu, zrób twardy rollback
                await fetchOnce()
                throw e // Przekaż błąd wyżej, aby komponent mógł zareagować
            }
        },
        [hasLookup, orderLookup, fetchOnce]
    )

    return {
        // state
        loading: s.loading,
        refreshing: s.refreshing,
        address: s.address,
        buildingNo: s.buildingNo, // Przekazujemy dla spójności (mimo że jest w address)
        courierText: s.courierText,
        deliveryNotes: s.deliveryNotes, // Przekazujemy dla spójności

        // actions
        refresh,
        upsertAddress, // NOWA FUNKCJA
    }
}

export type UseAddressReturn = ReturnType<typeof useAddress>