// @/utils/supabase/files.ts (OSTATECZNA, CZYSTA WERSJA 10/10)
'use client'

import { createBrowserClient } from '@supabase/ssr'
// ⭐️ POPRAWKA 1: Prawidłowa ścieżka importu (katalog wyżej)
import { ensurePreviewableImages } from '../convertImages' 

/* ==============================
     🔧 KONFIGURACJA
============================== */
const BUCKET = 'orders'
const SIGNED_URL_TTL = 900 // 15 minut

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ==============================
     🧩 FUNKCJE BUDOWANIA ŚCIEŻEK
============================== */

/**
 * Buduje ścieżkę uploadu dla załączników ogólnych zamówienia (StatusPanel)
 * [orderNumber]/attachments/[fileName]
 */
export function buildAttachmentPath(orderNumber: string, fileName: string) {
    if (!orderNumber) {
        throw new Error(`Invalid order number: ${orderNumber}`)
    }
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    // ⭐️ POPRAWKA 2: Usunięto Date.now() dla czystej nazwy
    return `${orderNumber}/attachments/${safeFileName}`
}

/**
 * Buduje ścieżkę dla pozycji zamówienia (ItemsPanel)
 * [orderNumber]/items/[itemNumber]/[fileName]
 */
export function buildItemPath(orderNumber: string, itemNumber: string, fileName: string) {
    if (!orderNumber || !itemNumber) {
        console.warn('buildItemPath: Brak orderNumber lub itemNumber, używam ścieżki tymczasowej.');
        return `temp/items/${Date.now()}-${fileName}`; 
    }
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    return `${orderNumber}/items/${itemNumber}/${safeFileName}`
}


/* ==============================
     🚀 FUNKCJE STORAGE (API)
============================== */

/**
 * Główna funkcja uploadująca:
 * 1. Konwertuje na WebP (przez ensurePreviewableImages)
 * 2. Wrzuca do Storage (z upsert: true)
 */
export async function uploadFiles(files: File[], folderPathFn: (file: File) => string) {
    const results: { path: string; file_name: string; size: number; mime?: string }[] = []

    // 1. Konwersja HEIC/WebP
    const processedFiles = await ensurePreviewableImages(files);

    for (const file of processedFiles) { 
        const path = folderPathFn(file); 

        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
            // upsert: true naprawia błąd 409 (Duplicate)
            upsert: true, 
            contentType: file.type || undefined,
        })

        if (error) {
            console.error('Upload error:', error)
            throw error
        }

        results.push({
            path,
            file_name: file.name,
            size: file.size,
            mime: file.type,
        })
    }

    return results
}

/**
 * Helper: Uploaduje pliki dla załączników ogólnych (StatusPanel)
 */
export async function uploadOrderAttachments(orderNumber: string, files: File[]) {
    return uploadFiles(files, (file) => buildAttachmentPath(orderNumber, file.name));
}


/**
 * Helper: Uploaduje pliki dla pozycji zamówienia (ItemsPanel)
 */
export async function uploadItemFiles(orderNumber: string, itemNumber: string, files: File[]) {
    return uploadFiles(files, (file) => buildItemPath(orderNumber, itemNumber, file.name));
}


/**
 * Tworzy tymczasowy (signed) URL do prywatnego pliku.
 */
export async function createSignedUrl(path: string, ttlSec = SIGNED_URL_TTL): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSec)
    if (error) {
        console.error('Signed URL error:', error)
        throw error
    }
    return data.signedUrl
}

/**
 * Usuwa jeden lub wiele plików (po ich `path`)
 */
export async function removeFiles(paths: string[]): Promise<void> {
    if (!paths.length) return
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) {
        console.error('Remove error:', error)
        throw error
    }
}