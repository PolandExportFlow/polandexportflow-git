'use client'

import { useCallback } from 'react'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import type { ClientFile } from '../clientOrderTypes'
import { supabase } from '@/utils/supabase/client'

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_')

// Helper do sprawdzania czy string to UUID
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

function resolveLookup(ctxOrderId: string, explicit?: string): string {
    const raw = explicit ?? ctxOrderId ?? ''
    return String(raw || '').replace(/^#/, '').trim()
}

// ✅ NOWY, KOMPATYBILNY GENERATOR KRÓTKIEGO ID
const generateShortId = (): string => Math.random().toString(36).substring(2, 5);


export function useStatus() {
    const { orderId, refreshSoft } = useClientOrderModalCtx()

    const setOrderNote = useCallback(async (lookupMaybe: string | undefined, note: string) => {
        const lookup = resolveLookup(orderId, lookupMaybe)
        if (!lookup) return
        const { error } = await supabase.rpc('user_order_update_note', {
            p_lookup: lookup,
            p_note: note
        })
        if (error) throw new Error(error.message)
        await refreshSoft?.()
    }, [orderId, refreshSoft])

    // 🛑 POPRAWIONE: Używa Edge Function do pełnego usunięcia (R2 + Baza)
    const deleteOrder = useCallback(async (lookupMaybe: string | undefined) => {
        const lookup = resolveLookup(orderId, lookupMaybe)
        if (!lookup) return
        
        // 1. Wołamy Edge Function (ona czyści R2 i potem woła SQL)
        const { error } = await supabase.functions.invoke('user_order_delete', {
            body: { lookup }
        })
        
        if (error) {
            console.error('Edge delete failed, trying RPC fallback...', error)
            // 2. Fallback: Jeśli Edge padnie, usuwamy chociaż z bazy
            const { error: rpcErr } = await supabase.rpc('user_order_delete', { p_lookup: lookup })
            if (rpcErr) throw new Error(rpcErr.message)
        }
    }, [orderId])

    const addAttachments = useCallback(async (lookupMaybe: string | undefined, files: File[]) => {
        const lookup = resolveLookup(orderId, lookupMaybe)
        if (!lookup) throw new Error('Add files failed: missing lookup')
        if (!files.length) return

        // Rozróżniamy UUID od OrderNumber
        let query = supabase.from('orders').select('id, order_number')
        if (isUUID(lookup)) {
            query = query.eq('id', lookup)
        } else {
            query = query.eq('order_number', lookup)
        }

        const { data: orderData, error: orderErr } = await query.single()

        if (orderErr || !orderData) throw new Error('Order not found for upload')

        for (const file of files) {
            const cleanName = safeName(file.name)
            // ✅ POPRAWKA: Użycie kompatybilnego generatora zamiast wadliwego crypto.randomUUID()
            const uniqueId = generateShortId(); 
            const storage_path = `${orderData.order_number}/general/${uniqueId}__${cleanName}`

            // Atomic Upload przez Edge Function
            const { data: genData, error: genError } = await supabase.functions.invoke(
                'user_order_file_upload_generate_url',
                {
                    body: {
                        storage_path,
                        file_size: file.size,
                        mime_type: file.type,
                        order_id: orderData.id,
                    },
                }
            )

            if (genError || !genData?.presignedUrl) {
                console.error('Upload URL Error:', genError)
                throw new Error(`Failed to generate upload URL for ${file.name}`)
            }

            const uploadRes = await fetch(genData.presignedUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            })

            if (!uploadRes.ok) {
                throw new Error(`Failed to upload ${file.name} to R2`)
            }
        }

        await refreshSoft?.()
    }, [orderId, refreshSoft])

    const deleteAttachment = useCallback(async (file: ClientFile) => {
        if (!file.id) return

        // 1. R2 Delete (Edge Function)
        const { error: efError } = await supabase.functions.invoke('user_order_file_delete', {
            body: { file_id: file.id }
        })
        if (efError) console.warn('R2 delete warning:', efError)

        // 2. DB Delete (RPC przez Next.js API)
        const res = await fetch('/api/rpc/user_order_file_delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                p_file_id: file.id
            }),
        })

        if (!res.ok) {
            const txt = await res.text().catch(() => '')
            throw new Error(`DB delete failed: ${txt}`)
        }

        await refreshSoft?.()
    }, [refreshSoft])

    return { setOrderNote, deleteOrder, addAttachments, deleteAttachment }
}