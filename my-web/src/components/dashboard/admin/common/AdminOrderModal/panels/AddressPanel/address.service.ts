// app/admin/components/sections/orders/services/address.service.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import { AddressBlock } from '../../AdminOrderTypes'

/* ======================================================
 * Helper: tekst dla kuriera
 * ====================================================== */
export function composeCourierText(addr: AddressBlock, houseNo?: string | null): string {
    const line1 = [addr.order_fullname].filter(Boolean).join(' ')
    const line2 = [addr.order_street, houseNo].filter(Boolean).join(' ')
    const line3 = [addr.order_postal_code, addr.order_city].filter(Boolean).join(' ')
    const line4 = [addr.order_country].filter(Boolean).join(' ')
    const contacts = [addr.order_phone, addr.order_email].filter(Boolean).join('  •  ')
    return [line1, line2, line3, line4, contacts].filter(Boolean).join('\n')
}

/* ======================================================
 * Pobranie adresu po LOOKUP (order_number)
 * ====================================================== */
export async function adminFetchAddressByLookup(lookup: string): Promise<{
    address: AddressBlock | null
    buildingNo: string | null
    courierText: string
    deliveryNotes: string
}> {
    const safe = (lookup ?? '').trim()
    if (!safe) return { address: null, buildingNo: null, courierText: '', deliveryNotes: '' }

    try {
        // 1️⃣ Resolve lookup -> UUID
        const { data: resolvedId, error: resErr } = await supabase.rpc('admin_order_resolve_id', { p_input: safe })
        if (resErr) throw resErr
        const orderId = (resolvedId ?? null) as string | null
        if (!orderId) throw new Error('Nie znaleziono order_id dla lookup=' + safe)

        // 2️⃣ Pobierz dane z orders
        const { data, error } = await supabase
            .from('orders')
            .select([
                'order_fullname',
                'order_email',
                'order_phone',
                'order_country',
                'order_city',
                'order_postal_code',
                'order_street',
                'order_house_number',
                'order_delivery_notes',
            ].join(','))
            .eq('id', orderId)
            .maybeSingle()

        if (error) throw error
        if (!data) return { address: null, buildingNo: null, courierText: '', deliveryNotes: '' }

        const row = data as Record<string, any>

        // Mapowanie 1:1 na AddressBlock
        const address: AddressBlock = {
            order_fullname: row.order_fullname ?? null,
            order_email: row.order_email ?? null,
            order_phone: row.order_phone ?? null,
            order_country: row.order_country ?? null,
            order_city: row.order_city ?? null,
            order_postal_code: row.order_postal_code ?? null,
            order_street: row.order_street ?? null,
            // UWAGA: dodajemy brakujące pole
            order_house_number: row.order_house_number ?? null,
            order_delivery_notes: row.order_delivery_notes ?? null,
        }

        const buildingNo = row.order_house_number ?? null
        const courierText = composeCourierText(address, buildingNo)
        const deliveryNotes = row.order_delivery_notes ?? ''

        return { address, buildingNo, courierText, deliveryNotes }
    } catch (err) {
        logSbError('[adminFetchAddressByLookup]', err)
        return { address: null, buildingNo: null, courierText: '', deliveryNotes: '' }
    }
}

/* ======================================================
 * Aktualizacja bloku adresu (Admin)
 * ====================================================== */
export async function adminUpdateAddress(lookup: string, patch: Partial<AddressBlock>) {
    const safeLookup = (lookup ?? '').trim()
    if (!safeLookup) throw new Error('Brak lookup (order_number) do aktualizacji adresu.')
    if (!patch || Object.keys(patch).length === 0) {
        console.warn('[adminUpdateAddress] Pusty patch, pomijam wywołanie RPC.')
        return // Nic do zrobienia
    }

    try {
        const { data, error } = await supabase.rpc('admin_order_update_address', {
            p_lookup: safeLookup,
            p_patch: patch,
        })

        if (error) throw error
        return data // Zwróć { ok: true, updated: true, order_id: ... }
    } catch (err) {
        logSbError('[adminUpdateAddress]', err)
        throw err
    }
}