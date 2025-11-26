'use client'

import { useMemo } from 'react'
import type { ClientOrderModalPayload } from '../clientOrderTypes'
// ✅ Upewnij się, że ścieżka do utils/orderStatus jest poprawna w Twoim projekcie
import { OrderStatus } from '@/utils/orderStatus'

export type OrderUI = {
    // Flagi uprawnień
    canEdit: boolean          
    canSubmit: boolean        
    canUnsubmit: boolean      
    
    // Flagi widoczności sekcji
    showPayment: boolean     
    showTracking: boolean     
    showWarehouseAddr: boolean 
    
    // Pomocnicze
    isSubmitted: boolean
}

export function useOrderUI(data: ClientOrderModalPayload | null): OrderUI {
    return useMemo(() => {
        // 1. Safe guard: Brak danych = wszystko zablokowane/ukryte
        if (!data) {
            return {
                canEdit: false,
                canSubmit: false,
                canUnsubmit: false,
                showPayment: false,
                showTracking: false,
                showWarehouseAddr: false,
                isSubmitted: false,
            }
        }

        // 2. Pobranie i normalizacja statusu
        const status = (data.statusPanel.order_status || 'created') as OrderStatus
        
        const isCreated = status === 'created'
        const isSubmitted = status === 'submitted'

        // 3. Logika uprawnień (Permissions)
        
        // Edycja dozwolona TYLKO w fazie 'created' (Draft).
        const canEdit = isCreated

        // Submit tylko z draftu
        const canSubmit = isCreated 
        
        // Cofnięcie submitu tylko gdy jest submitted
        const canUnsubmit = isSubmitted 

        // 4. Logika widoczności (Visibility)
        const showPayment = true 

        // ✅ Pokazuj tylko jeśli są faktyczne dane trackingu (przewoźnik lub link)
        const showTracking = !!data.trackingPanel && (
            !!data.trackingPanel.selected_carrier || !!data.trackingPanel.selected_tracking_link
        )

        const showWarehouseAddr = true

        return {
            canEdit,
            canSubmit,
            canUnsubmit,
            showPayment,
            showTracking,
            showWarehouseAddr,
            isSubmitted,
        }
    }, [data])
}