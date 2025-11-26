'use client'

import { useCallback } from 'react'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import type { ItemsPanelRowDB, ClientFile } from '../clientOrderTypes'
import { supabase } from '@/utils/supabase/client'
import { ensurePreviewableImages, DEFAULTS as IMG_DEFAULTS } from '@/utils/convertImages'

// --- Helpers ---
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
// ✅ Helper do wykrywania tymczasowego ID
const isTempId = (v: string) => String(v).startsWith('tmp-') || String(v).startsWith('CREATING-')

const tmpId = () => `tmp-${Math.random().toString(36).slice(2)}`
const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_')

async function readError(res: Response): Promise<string> {
    try {
        const j = await res.json()
        return j?.error || j?.message || JSON.stringify(j)
    } catch { return await res.text().catch(() => '') }
}

function resolveLookup(ctxOrderId: string, explicit?: string): string {
    const raw = explicit ?? ctxOrderId ?? ''
    return String(raw || '').replace(/^#/, '').trim()
}

export function useItems() {
    const { data, orderId, addLocalItem, replaceLocalItem, updateLocalItem, removeLocalItem, refreshSoft } = useClientOrderModalCtx()

    const getItemById = (itemId: string) => (data?.itemsPanel ?? []).find(i => String(i.id) === String(itemId))

    const addItem = useCallback(
        async (patch: Partial<ItemsPanelRowDB> = {}) => {
            if (!orderId) throw new Error('Add failed: missing orderId')
            // ✅ FIX: Używamy oczyszczonego lookupu (bez #)
            const lookup = resolveLookup(orderId)

            const tid = `CREATING-${tmpId()}`
            const newItemSkeleton: ItemsPanelRowDB = {
                id: tid,
                item_number: null,
                item_status: patch.item_status ?? 'none',
                item_name: patch.item_name ?? 'New item',
                item_url: patch.item_url ?? null,
                item_note: patch.item_note ?? null,
                item_value: patch.item_value ?? 0,
                item_quantity: patch.item_quantity ?? 1,
                item_weight: patch.item_weight ?? 0,
                item_length: patch.item_length ?? 0,
                item_width: patch.item_width ?? 0,
                item_height: patch.item_height ?? 0,
                created_at: new Date().toISOString(),
                files: [],
            } as ItemsPanelRowDB
            
            addLocalItem?.(newItemSkeleton)

            try {
                const res = await fetch('/api/rpc/user_order_item_add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // ✅ Używamy oczyszczonego lookupu
                    body: JSON.stringify({ p_lookup: lookup, p_patch: patch }),
                })
                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Add failed (${res.status})${msg ? `: ${msg}` : ''}`)
                }

                const j = await res.json().catch(() => ({}))
                const created = (j?.item ?? j?.data?.item) as ItemsPanelRowDB | undefined

                if (created?.id && created?.item_number) {
                    replaceLocalItem?.(tid, created)
                } else {
                    throw new Error('Add failed: Server did not return the created item.')
                }
            } catch (e) {
                removeLocalItem?.(tid)
                throw e
            }
        },
        [orderId, addLocalItem, replaceLocalItem, removeLocalItem]
    )

    const deleteItem = useCallback(
        async (itemId: string) => {
            if (!orderId) throw new Error('Delete failed: missing orderId')
            const lookup = resolveLookup(orderId)
            const id = String(itemId)

            if (isTempId(id)) {
                removeLocalItem?.(id)
                return
            }
            if (!isUUID(id)) throw new Error('Cannot delete: item_id is not UUID')

            const itemToDelete = getItemById(id)
            const filesList = itemToDelete?.files || []
            const backup = itemToDelete
            
            removeLocalItem?.(id)

            try {
                if (filesList.length > 0) {
                    await Promise.all(filesList.map(async (f: any) => {
                        if (!f.id) return
                        await supabase.functions.invoke('user_order_item_file_delete', { body: { file_id: f.id } })
                    }))
                }

                const res = await fetch('/api/rpc/user_order_item_delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_lookup: lookup, p_item_id: id }),
                })
                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Delete failed: ${msg}`)
                }
            } catch (e) {
                if (backup) addLocalItem?.(backup)
                throw e
            }
        },
        [orderId, removeLocalItem, addLocalItem, getItemById]
    )

    const updateItem = useCallback(
        async (itemId: string, patch: Partial<ItemsPanelRowDB>) => {
            if (!orderId) throw new Error('Update failed: missing orderId')
            const lookup = resolveLookup(orderId)
            
            if (Object.keys(patch).length === 0) return

            const prev = getItemById(itemId)
            
            updateLocalItem?.(itemId, { ...(prev || {}), ...patch })

            // 🛑 Jeśli to ID tymczasowe, nie wysyłamy do API
            if (isTempId(itemId)) {
                return
            }

            if (!isUUID(itemId)) {
                 console.warn('Skipping update for non-UUID item:', itemId)
                 return
            }

            try {
                const res = await fetch('/api/rpc/user_order_item_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_lookup: lookup, p_item_id: itemId, p_patch: patch }),
                })
                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Update failed: ${msg}`)
                }
                
                const j = await res.json().catch(() => null)
                const fresh = (j?.item ?? j?.data?.item) as ItemsPanelRowDB | undefined
                if (fresh?.id) updateLocalItem?.(itemId, fresh)

            } catch (e) {
                if (prev) updateLocalItem?.(itemId, prev)
                throw e
            }
        },
        [orderId, updateLocalItem, getItemById]
    )

    const addImages = useCallback(
        async (itemId: string, rawFiles: File[]) => {
            if (!orderId) throw new Error('Add images failed: missing orderId')
            const lookup = resolveLookup(orderId) // ✅ Clean lookup

            if (!rawFiles?.length) return

            // Nie można dodawać zdjęć do tymczasowego itemu
            if (isTempId(itemId)) {
                 console.warn('Cannot upload images to a temporary item. Wait for sync.')
                 return
            }

            const currentItem = getItemById(itemId)
            const itemNumber = currentItem?.item_number
            if (!itemNumber) throw new Error('Cannot upload: Item missing item_number')

            let filesToUpload = rawFiles
            try {
                filesToUpload = await ensurePreviewableImages(rawFiles, IMG_DEFAULTS)
            } catch (e) {
                console.warn('Image optimization failed', e)
            }

            const optimisticFiles = filesToUpload.map(file => ({
                id: `temp-${crypto.randomUUID()}`,
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
                file_url: URL.createObjectURL(file),
                storage_path: '',
                created_at: new Date().toISOString()
            })) as unknown as ClientFile[]

            const prevFiles = currentItem.files || []
            updateLocalItem?.(itemId, { files: [...prevFiles, ...optimisticFiles] })

            try {
                // 3. Upload
                for (const file of filesToUpload) {
                    const cleanName = safeName(file.name)
                    const uniqueId = crypto.randomUUID()
                    // Używamy lookup (bez #) w ścieżce
                    const storage_path = `${lookup}/items/${itemNumber}/${uniqueId}__${cleanName}`

                    const { data: genData, error: genError } = await supabase.functions.invoke(
                        'user_order_item_file_upload_generate_url',
                        {
                            body: {
                                storage_path,
                                file_size: file.size,
                                mime_type: file.type,
                                item_id: itemId,
                            },
                        }
                    )

                    if (genError || !genData?.presignedUrl) throw new Error(`Failed to get upload URL for ${file.name}`)

                    const uploadRes = await fetch(genData.presignedUrl, {
                        method: 'PUT',
                        body: file,
                        headers: { 'Content-Type': file.type },
                    })
                    if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name}`)
                }
                await refreshSoft?.()
            } catch (e) {
                console.error(e)
                updateLocalItem?.(itemId, { files: prevFiles }) // Revert on error
                throw e
            }
        },
        [orderId, getItemById, updateLocalItem, refreshSoft]
    )

    const removeImages = useCallback(
        async (itemId: string, imageIds: string[]) => {
            if (!orderId) throw new Error('Remove images failed: missing orderId')
            const lookup = resolveLookup(orderId) // ✅ Clean lookup
            if (!imageIds?.length) return

            await Promise.all(imageIds.map(async (id) => {
                if (id.startsWith('temp-')) return 
                const { error } = await supabase.functions.invoke('user_order_item_file_delete', { 
                    body: { file_id: id } 
                })
                if (error) console.warn(`R2 delete warning for file ${id}:`, error)
            }))

            const realIds = imageIds.filter(id => !id.startsWith('temp-'))
            
            if (realIds.length > 0) {
                 const res = await fetch('/api/rpc/user_order_item_file_delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_lookup: lookup, p_item_id: itemId, p_file_ids: realIds }),
                })

                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Remove images failed: ${msg}`)
                }
                
                const j = await res.json().catch(() => null)
                const fresh = (j?.item ?? j?.data?.item) as ItemsPanelRowDB | undefined
                if (fresh?.id) updateLocalItem?.(itemId, fresh)
            } else {
                 const currentItem = getItemById(itemId)
                 if (currentItem) {
                     const nextFiles = (currentItem.files || []).filter(f => !imageIds.includes(f.id))
                     updateLocalItem?.(itemId, { ...currentItem, files: nextFiles })
                 }
            }
        },
        [orderId, updateLocalItem, getItemById]
    )

    return { addItem, deleteItem, updateItem, addImages, removeImages }
}