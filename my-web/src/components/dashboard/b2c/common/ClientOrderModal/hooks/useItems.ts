'use client'

import { useCallback } from 'react'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import type { ItemsPanelRowDB, ClientFile } from '../clientOrderTypes'
import { supabase } from '@/utils/supabase/client'

// --- Helpers ---
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const isTempId = (v: string) => /^tmp-|^CREATING-/i.test(v)
const tmpId = () =>
    `tmp-${
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? (crypto as any).randomUUID()
            : Math.random().toString(36).slice(2)
    }`

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_')

async function readError(res: Response): Promise<string> {
    try {
        const j = await res.json()
        return j?.error || j?.message || JSON.stringify(j)
    } catch {
        try {
            return await res.text()
        } catch {
            return ''
        }
    }
}

function resolveLookup(ctxOrderId: string, explicit?: string): string {
    const raw = explicit ?? ctxOrderId ?? ''
    return String(raw || '')
        .replace(/^#/, '')
        .trim()
}
// --- Koniec Helpers ---

export function useItems() {
    const { data, orderId, addLocalItem, replaceLocalItem, updateLocalItem, removeLocalItem, refreshSoft } = useClientOrderModalCtx()

    const getItemById = (itemId: string) => (data?.itemsPanel ?? []).find(i => String(i.id) === String(itemId))

    const addItem = useCallback(
        async (lookupMaybe?: string, patch: Partial<ItemsPanelRowDB> = {}) => {
            const lookup = resolveLookup(orderId, lookupMaybe)
            if (!lookup) throw new Error('Add failed: missing lookup (orderId/order_number)')

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
        async (lookupMaybe: string | undefined, itemId: string) => {
            const lookup = resolveLookup(orderId, lookupMaybe)
            if (!lookup) throw new Error('Delete failed: missing lookup')

            const id = String(itemId)

            if (isTempId(id)) {
                removeLocalItem?.(id)
                return
            }
            if (!isUUID(id)) throw new Error('Cannot delete: item_id is not UUID')

            const itemToDelete = (data?.itemsPanel ?? []).find(r => String(r.id) === id)
            const filesList = itemToDelete?.files || []
            const backup = itemToDelete
            
            removeLocalItem?.(id)

            try {
                // 1. Usuń pliki z R2 (Edge Function)
                if (filesList.length > 0) {
                    await Promise.all(filesList.map(async (f: any) => {
                        if (!f.id) return
                        const { error } = await supabase.functions.invoke('user_order_item_file_delete', {
                            body: { file_id: f.id } // 🛑 file_id
                        })
                        if (error) console.warn(`Failed to clean up file from R2 (File ID: ${f.id})`, error)
                    }))
                }

                // 2. Usuń item z bazy
                const res = await fetch('/api/rpc/user_order_item_delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_lookup: lookup, p_item_id: id }),
                })
                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Delete failed (${res.status})${msg ? `: ${msg}` : ''}`)
                }
            } catch (e) {
                if (backup) addLocalItem?.(backup)
                throw e
            }
        },
        [orderId, removeLocalItem, addLocalItem, data]
    )

    const updateItem = useCallback(
        async (lookupMaybe: string | undefined, itemId: string, patch: Partial<ItemsPanelRowDB>) => {
            const lookup = resolveLookup(orderId, lookupMaybe)
            if (!lookup) throw new Error('Update failed: missing lookup')
            if (Object.keys(patch).length === 0) return

            const prev = (data?.itemsPanel ?? []).find(r => String(r.id) === String(itemId))
            updateLocalItem?.(itemId, { ...(prev || {}), ...patch })

            const payload = { p_lookup: lookup, p_item_id: itemId, p_patch: patch }

            try {
                const res = await fetch('/api/rpc/user_order_item_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Update failed (${res.status})${msg ? `: ${msg}` : ''}`)
                }

                const j = await res.json().catch(() => null)
                const fresh = (j?.item ?? j?.data?.item) as ItemsPanelRowDB | undefined

                if (fresh?.id) updateLocalItem?.(itemId, fresh)
                else throw new Error('Update failed: Server did not return the updated item.')
            } catch (e) {
                if (prev) updateLocalItem?.(itemId, prev)
                throw e
            }
        },
        [orderId, updateLocalItem, data]
    )

    const addImages = useCallback(
        async (
            lookupMaybe: string | undefined,
            itemId: string,
            files: File[]
        ) => {
            const lookup = resolveLookup(orderId, lookupMaybe)
            if (!lookup) throw new Error('Add images failed: missing lookup')
            if (!files?.length) return

            const currentItem = getItemById(itemId)
            const itemNumber = currentItem?.item_number
            if (!itemNumber) throw new Error('Cannot upload: Item not saved or missing item_number')

            // 1. Optimistic UI
            const optimisticFiles = Array.from(files).map(file => ({
                id: `temp-${crypto.randomUUID()}`,
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
                file_url: URL.createObjectURL(file),
                storage_path: '',
                created_at: new Date().toISOString()
            })) as unknown as ClientFile[]

            const prevFiles = currentItem.files || []
            updateLocalItem?.(itemId, {
                files: [...prevFiles, ...optimisticFiles]
            })

            try {
                // 2. Upload (Atomic - przez Edge Function)
                for (const file of files) {
                    const cleanName = safeName(file.name)
                    const uniqueId = crypto.randomUUID()
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

                // 3. Sync (Soft Refresh by pobrać prawdziwe ID z bazy)
                await refreshSoft?.()

            } catch (e) {
                console.error('Add images flow error:', e)
                updateLocalItem?.(itemId, { files: prevFiles })
                throw e
            }
        },
        [orderId, updateLocalItem, getItemById, refreshSoft]
    )

    const removeImages = useCallback(
        async (lookupMaybe: string | undefined, itemId: string, imageIds: string[]) => {
            const lookup = resolveLookup(orderId, lookupMaybe)
            if (!lookup) throw new Error('Remove images failed: missing lookup')
            if (!imageIds?.length) return

            // 1. Usuwamy pliki z R2 (Edge Function)
            await Promise.all(imageIds.map(async (id) => {
                const { error } = await supabase.functions.invoke('user_order_item_file_delete', {
                    body: { file_id: id } // 🛑 file_id
                })
                if (error) console.warn(`R2 delete warning for ${id}:`, error)
            }))

            // 2. Usuwamy z bazy (RPC)
            const res = await fetch('/api/rpc/user_order_item_file_delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    p_lookup: lookup,
                    p_item_id: itemId,
                    p_file_ids: imageIds.map(String),
                }),
            })

            if (!res.ok) {
                const msg = await readError(res)
                throw new Error(`Remove images failed (${res.status})${msg ? `: ${msg}` : ''}`)
            }

            const j = await res.json().catch(() => null)
            const fresh = (j?.item ?? j?.data?.item) as ItemsPanelRowDB | undefined

            if (fresh?.id) updateLocalItem?.(itemId, fresh)
            else throw new Error('Remove images failed: Server did not return the updated item.')
        },
        [orderId, updateLocalItem]
    )

    return { addItem, deleteItem, updateItem, addImages, removeImages }
}