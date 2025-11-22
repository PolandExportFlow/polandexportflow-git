// src/components/dashboard/admin/common/AdminOrderModal/services/status.service.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import { AdminOrderModalData } from '../../AdminOrderTypes'

// GET – główny payload modala
export async function getAdminOrder(lookup: string): Promise<AdminOrderModalData | null> {
    try {
        const { data, error } = await supabase.rpc('admin_get_modal_order', { p_lookup: (lookup ?? '').trim() })
        if (error) throw error
        return (data as AdminOrderModalData) ?? null
    } catch (err) {
        logSbError('[status.service.getAdminOrder]', err)
        return null
    }
}

// PATCH – status / source
export async function updateOrderStatus(orderIdOrNumber: string, patch: { status?: string; source?: string }) {
    try {
        // ZMIANA: Używamy nowej, ujednoliconej nazwy funkcji RPC
        const { error } = await supabase.rpc('admin_order_update_status', {
            p_lookup: (orderIdOrNumber ?? '').trim(),
            p_status: patch.status ?? null,
            p_source: patch.source ?? null,
        })
        if (error) throw error
    } catch (err) {
        logSbError('[status.service.updateOrderStatus]', err)
        throw err
    }
}

// Zapis notatki
export async function saveAdditionalInfo(lookup: string, info: string): Promise<void> {
    try {
        // ZMIANA: Używamy nowej, ujednoliconej nazwy funkcji RPC
        const { error } = await supabase.rpc('admin_order_update_additional_info', {
            p_lookup: (lookup ?? '').trim(),
            p_info: info ?? '',
        })
        if (error) throw error
    } catch (err) {
        logSbError('[status.service.saveAdditionalInfo]', err)
        throw err
    }
}