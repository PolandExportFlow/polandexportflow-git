'use client'

import { useCallback } from 'react'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import type { ClientFile } from '../clientOrderTypes'
import { supabase } from '@/utils/supabase/client'
import { ensurePreviewableImages, DEFAULTS as IMG_DEFAULTS } from '@/utils/convertImages'

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_')
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const generateShortId = (): string => Math.random().toString(36).substring(2, 5)

export function useStatus() {
    const { orderId, refreshSoft } = useClientOrderModalCtx()

    // --- Status Actions ---
    const changeStatus = useCallback(async (newStatus: string) => {
        if (!orderId) return
        const { error } = await supabase.rpc('user_order_update_status', {
            p_lookup: orderId,
            p_status: newStatus
        })
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
             console.error('RPC user_order_update_status missing')
             throw new Error(error.message)
        } else if (error) {
            throw new Error(error.message)
        }
        await refreshSoft?.()
    }, [orderId, refreshSoft])

    const submitOrder = useCallback(async () => await changeStatus('submitted'), [changeStatus])
    const unsubmitOrder = useCallback(async () => await changeStatus('created'), [changeStatus])

    // --- Note Actions ---
    const setOrderNote = useCallback(async (note: string) => {
        if (!orderId) return
        const { error } = await supabase.rpc('user_order_update_note', {
            p_lookup: orderId,
            p_note: note
        })
        if (error) throw new Error(error.message)
        await refreshSoft?.()
    }, [orderId, refreshSoft])

    // --- Delete Actions ---
    const deleteOrder = useCallback(async () => {
        if (!orderId) return
        
        // 1. Edge Function (Główna logika: Clean R2 -> Clean DB)
        // Ta funkcja musi po stronie serwera wylistować pliki w folderze ordera i je usunąć.
        const { error } = await supabase.functions.invoke('user_order_delete', {
            body: { lookup: orderId }
        })
        
        if (error) {
            console.error('Edge delete failed, trying RPC fallback (files might remain in R2)...', error)
            // 2. Fallback RPC (Tylko czyści bazę, jeśli Edge padnie)
            const { error: rpcErr } = await supabase.rpc('user_order_delete', { p_lookup: orderId })
            if (rpcErr) throw new Error(rpcErr.message)
        }
    }, [orderId])

    const deleteAttachment = useCallback(async (file: ClientFile) => {
        if (!file.id) return
        
        // 1. CZYSZCZENIE R2 (Cloudflare)
        const { error: efError } = await supabase.functions.invoke('user_order_file_delete', {
            body: { file_id: file.id }
        })
        if (efError) console.warn('R2 delete warning:', efError)

        // 2. CZYSZCZENIE BAZY (SQL)
        const res = await fetch('/api/rpc/user_order_file_delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_file_id: file.id }),
        })

        if (!res.ok) {
            const txt = await res.text().catch(() => '')
            throw new Error(`DB delete failed: ${txt}`)
        }

        await refreshSoft?.()
    }, [refreshSoft])

    // --- Upload Actions (z konwersją) ---
    const addAttachments = useCallback(async (rawFiles: File[]) => {
        if (!orderId) throw new Error('Add files failed: missing orderId')
        if (!rawFiles.length) return

        // 1. Optymalizacja obrazków
        let filesToUpload = rawFiles
        try {
            filesToUpload = await ensurePreviewableImages(rawFiles, IMG_DEFAULTS)
        } catch (e) {
            console.warn('Image optimization failed, uploading raw files', e)
        }

        let query = supabase.from('orders').select('id, order_number')
        if (isUUID(orderId)) query = query.eq('id', orderId)
        else query = query.eq('order_number', orderId)

        const { data: orderData, error: orderErr } = await query.single()
        if (orderErr || !orderData) throw new Error('Order not found for upload')

        for (const file of filesToUpload) {
            const cleanName = safeName(file.name)
            const uniqueId = generateShortId()
            const storage_path = `${orderData.order_number}/general/${uniqueId}__${cleanName}`

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

            if (genError || !genData?.presignedUrl) throw new Error(`Failed to generate URL for ${file.name}`)

            const uploadRes = await fetch(genData.presignedUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            })

            if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name} to R2`)
        }

        await refreshSoft?.()
    }, [orderId, refreshSoft])

    return { setOrderNote, deleteOrder, addAttachments, deleteAttachment, submitOrder, unsubmitOrder }
}