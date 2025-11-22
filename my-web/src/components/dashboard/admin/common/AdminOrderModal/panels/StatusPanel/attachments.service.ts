// app/admin/components/sections/orders/panels/StatusPanel/attachments.service.ts (POPRAWIONA WERSJA)
'use client'

import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import type { Attachment } from '../../AdminOrderTypes'
// ⭐️ ZMIANA: Importujemy 'uploadOrderAttachments' zamiast 'uploadFiles' i 'buildAttachmentPath'
import { removeFiles, uploadOrderAttachments } from '@/utils/supabase/files'
// 🟢 Konwersja HEIC (jest już obsługiwana wewnątrz uploadFiles/uploadOrderAttachments)
// import { ensurePreviewableImages } from '@/utils/convertImages' // Już niepotrzebne tutaj


// =================================================================
// LIST (Pobieranie załączników dla zamówienia) - BEZ ZMIAN
// =================================================================
export async function list(orderId: string): Promise<Attachment[]> {
    try {
        const { data, error } = await supabase
            .from('order_attachments')
            .select('id, storage_path, file_name, mime_type, created_at')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data as Attachment[]) ?? []
    } catch (err) {
        logSbError('[order_attachments.list]', err)
        return []
    }
}

// =================================================================
// UPLOAD (Dodawanie pliku) - POPRAWIONE
// =================================================================
export async function addAttachments(
    orderId: string, // UUID (dla bazy danych)
    orderNumber: string, // PEF-XXX (dla ścieżki Storage)
    userId: string, 
    files: File[]
): Promise<Attachment[]> {
    if (!files.length) return []
    
    // 1. ⭐️ KROK KONWERSJI JEST TERAZ WEWNĄTRZ `uploadOrderAttachments` (w `uploadFiles`)
    
    // 2. ⭐️ Upload do Storage (używamy orderNumber dla ścieżki)
    // `uploadOrderAttachments` zajmie się konwersją HEIC
    const uploadResults = await uploadOrderAttachments(orderNumber, files)
    
    const attachmentsToInsert = uploadResults.map(r => ({
        order_id: orderId, // ⭐️ UUID dla bazy
        user_id: userId,
        file_name: r.file_name,
        mime_type: r.mime,
        storage_path: r.path, // ⭐️ Poprawna ścieżka (z orderNumber)
    }))
    
    // 3. Insert do bazy order_attachments
    try {
        const { data: dbData, error: dbError } = await supabase
            .from('order_attachments')
            .insert(attachmentsToInsert)
            .select('id, storage_path, file_name, mime_type, created_at')
            .returns<Attachment[]>()

        if (dbError) throw dbError // Poprawiono z dbData
        return dbData
    } catch (err) {
        logSbError('[order_attachments.addAttachments]', err)
        // Rollback plików ze Storage w razie błędu bazy
        await removeFiles(uploadResults.map(r => r.path))
        throw err
    }
}

// =================================================================
// DELETE (Usuwanie pliku) - BEZ ZMIAN
// =================================================================
export async function deleteAttachment(orderId: string, file: Attachment) {
    try {
        const { error: dbError } = await supabase
            .from('order_attachments')
            .delete()
            .eq('id', file.id)
            .eq('order_id', orderId)

        if (dbError) throw dbError

        if (file.storage_path) {
            await removeFiles([file.storage_path])
        }
    } catch (err) {
        logSbError('[order_attachments.deleteAttachment]', err)
        throw err
    }
}