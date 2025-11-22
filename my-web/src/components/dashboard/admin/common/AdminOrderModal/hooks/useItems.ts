// app/admin/components/sections/orders/hooks/useItems.ts (POPRAWIONA WERSJA)
'use client'

import { useEffect, useRef, useState } from 'react'
import { parseLocalizedNumber } from '@/utils/number'
import type { OrderItem, ItemImage } from '../AdminOrderTypes' 
import { 
    createItem, 
    deleteItem, 
    updateItem, 
    addItemAttachments, 
    removeItemAttachments,
    type ItemPatch,
    type ItemAttachmentPayload // ⭐️ Importujemy typ payloadu
} from '../panels/ItemsPanel/items.service'
// ⭐️ IMPORTUJEMY HELPERSY ZE STORAGE
import { removeFiles } from '@/utils/supabase/files'
import { logSbError } from '@/utils/supabase/errors'


type Row = OrderItem & { 
    _editingNote?: boolean; 
    _editingDims?: boolean 
}

const genTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
const toNum = (v: unknown): number | null => parseLocalizedNumber(v)
const genPEF = () => `PEF-${String(Math.floor(100000 + Math.random() * 900000))}-${String(Math.floor(100 + Math.random() * 900))}`

const normDims = (d?: { item_length?: unknown; item_width?: unknown; item_height?: unknown } | null) => ({
    item_length: toNum(d?.item_length ?? null),
    item_width: toNum(d?.item_width ?? null),
    item_height: toNum(d?.item_height ?? null),
})

function normalizeRow(pi: Partial<OrderItem> | any): Row {
    // ... (Logika normalizeRow bez zmian, używa OrderItem)
    const item_number = pi?.item_number ?? undefined
    return {
        id: String(pi.id ?? genTempId()),
        order_id: String(pi.order_id ?? ''),
        item_name: pi.item_name ?? '',
        item_url: pi.item_url ?? null,
        item_status: pi.item_status ?? 'awaiting',
        item_quantity: (typeof pi.item_quantity === 'number' ? pi.item_quantity : toNum(pi.item_quantity) ?? 1),
        item_value: (typeof pi.item_value === 'number' ? pi.item_value : toNum(pi.item_value)) ?? null,
        payment_currency: pi.payment_currency ?? 'PLN',
        item_weight: (typeof pi.item_weight === 'number' ? pi.item_weight : toNum(pi.item_weight)) ?? null,
        dimensions: {
            item_length: toNum(pi.dimensions?.item_length ?? pi.item_length),
            item_width: toNum(pi.dimensions?.item_width ?? pi.item_width),
            item_height: toNum(pi.dimensions?.item_height ?? pi.item_height),
        } as any, 
        item_note: pi.item_note ?? null,
        item_images: Array.isArray(pi.item_images) ? pi.item_images : [],
        item_number: item_number as string | undefined,
        _editingNote: false,
        _editingDims: false,
    }
}

function definedPatch<T extends object>(obj: Partial<T>): Partial<T> {
    const out: any = {}
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
    return out
}

export function useItems({
    orderId,
    items = [],
    onChange,
}: {
    orderId?: string
    items?: OrderItem[]
    onChange?: (rows: OrderItem[]) => void | Promise<void>
}) {
    const [rows, setRows] = useState<Row[]>(() => (items ?? []).map(normalizeRow))
    useEffect(() => {
        setRows((items ?? []).map(normalizeRow))
    }, [items])

    const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
    const busy = useRef<Record<string, boolean>>({})
    const addingRef = useRef(false)

    const setRow = (id: string, patch: Partial<Row>) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    }

    const commitRow = async (id: string, patch: Partial<Row>) => {
        // ... (Logika commitRow bez zmian) ...
        const cur = rows.find(x => x.id === id)
        if (!cur) return

        if (onChange) {
            const next = rows.map(x => (x.id === id ? { ...x, ...patch } : x))
            setRows(next)
            await onChange(next as OrderItem[])
            return
        }

        const toSave: ItemPatch = {
            item_name: patch.item_name ?? cur.item_name,
            item_status: patch.item_status ?? cur.item_status,
            item_url: patch.item_url !== undefined ? patch.item_url : cur.item_url,
            item_value: toNum(patch.item_value ?? cur.item_value),
            item_quantity: (toNum(patch.item_quantity ?? cur.item_quantity) ?? 1),
            item_weight: toNum(patch.item_weight ?? cur.item_weight),
            item_note: patch.item_note ?? cur.item_note ?? null,
            item_length: toNum(patch.dimensions?.item_length ?? cur.dimensions.item_length),
            item_width: toNum(patch.dimensions?.item_width ?? cur.dimensions.item_width),
            item_height: toNum(patch.dimensions?.item_height ?? cur.dimensions.item_height),
        }

        const saved = await updateItem(id, definedPatch(toSave))
        const safe = definedPatch<OrderItem>(saved as any)
        setRows(prev => prev.map(x => (x.id === id ? { ...x, ...safe } : x)))
    }

    const setAndCommit = async (id: string, patch: Partial<Row>, isLocalOnly: boolean = false) => {
        setRow(id, patch)
        if (isLocalOnly) return 
        await commitRow(id, patch)
    }

    const addItem = async (patch?: ItemPatch) => {
        // ... (Logika addItem bez zmian) ...
        const oid = orderId || rows[0]?.order_id
        if (!oid) throw new Error('orderId is required to add item')
        if (addingRef.current) return

        addingRef.current = true
        const tempId = genTempId()
        const temp = normalizeRow({
            id: tempId, order_id: oid, item_number: genPEF(), ...patch
        })
        setRows(prev => [...prev, temp])

        try {
            const created = await createItem(oid, definedPatch({
                item_name: (patch?.item_name ?? 'New Item'),
                item_url: (patch?.item_url ?? null),
                item_value: toNum(patch?.item_value),
                item_quantity: (toNum(patch?.item_quantity) ?? 1),
                item_weight: toNum(patch?.item_weight),
                item_length: toNum(patch?.dimensions?.item_length),
                item_width: toNum(patch?.dimensions?.item_width),
                item_height: toNum(patch?.dimensions?.item_height),
            }))
            const norm = normalizeRow(created as Partial<OrderItem>)
            setRows(prev => prev.map(r => (r.id === tempId ? norm : r)))
            return norm
        } catch (e) {
            setRows(prev => prev.filter(r => r.id !== tempId))
            throw e
        } finally {
            addingRef.current = false
        }
    }

    const removeItem = async (id: string) => {
        // ... (Logika removeItem bez zmian) ...
        const before = rows
        setRows(prev => prev.filter(r => r.id !== id))
        try {
            await deleteItem(id)
        } catch (e) {
            setRows(before)
            throw e
        }
    }

    const openPicker = (id: string) => fileInputs.current[id]?.click()

    const addImagesLocal = (id: string, files: File[]) => {
        // ... (Logika dodawania lokalnego preview)
        const newImgs: Partial<ItemImage>[] = 
            files?.map((f, i) => ({
                id: `temp-${Date.now()}-${i}`,
                file_url: URL.createObjectURL(f),
                file_name: f.name,
                uploaded_at: new Date().toISOString(),
                mime: f.type || undefined,
            })) ?? []
        setRows(prev => prev.map(r => (r.id === id ? { ...r, item_images: [...(r.item_images ?? []), ...(newImgs as ItemImage[])] } : r)))
    }

    // ⭐️ Zmieniamy logikę: onSelectFiles i onDrop będą teraz przekazywać wywołanie do `onUploadImages` z ItemsPanel
    const onSelectFiles = async (id: string, list: FileList | null, onUpload: (id: string, files: File[]) => Promise<void>) => {
        if (!list?.length) return
        const files = Array.from(list)
        addImagesLocal(id, files) // Pokazujemy lokalny podgląd
        try {
            busy.current[id] = true
            await onUpload(id, files) // ⭐️ Wywołujemy upload przekazany z ItemsPanel
        } finally {
            busy.current[id] = false
        }
    }

    const onDrop = async (id: string, e: React.DragEvent<HTMLDivElement>, onUpload: (id: string, files: File[]) => Promise<void>) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer?.files || [])
        if (!files.length) return
        addImagesLocal(id, files) // Pokazujemy lokalny podgląd
        try {
            busy.current[id] = true
            await onUpload(id, files) // ⭐️ Wywołujemy upload przekazany z ItemsPanel
        } finally {
            busy.current[id] = false
        }
    }

    // ⭐️ NOWA LOGIKA: Używamy dedykowanego RPC
    const addImages = async (
        id: string,
        images: ItemAttachmentPayload // Używamy typu z serwisu
    ) => {
        if (!images?.length) return
        
        try {
            // ⭐️ Użycie dedykowanego RPC (które zwraca SETOF ItemImage[])
            const savedAttachments = await addItemAttachments(id, images) 
            
            // ⭐️ Aktualizujemy stan lokalny nowymi, prawdziwymi danymi z bazy
            setRows(prev => prev.map(x => {
                if (x.id === id) {
                    // Usuwamy stare tymczasowe ID i wstawiamy nowe z bazy
                    const existingImages = (x.item_images ?? []).filter(img => !String(img.id).startsWith('temp-'))
                    return {
                        ...x,
                        item_images: [...existingImages, ...savedAttachments] // ⭐️ savedAttachments to już ItemImage[]
                    }
                }
                return x;
            }))
        } catch (e) {
             logSbError('[useItems] addImages failed', e)
             // Rollback tymczasowych obrazów
            setRows(prev =>
                prev.map(r =>
                    r.id === id
                        ? {
                              ...r,
                              item_images: (r.item_images ?? []).filter(im => !images.some(n => n.id === (im as any)?.id)),
                          }
                        : r
                )
            )
            throw e
        }
    }

    // ⭐️ NOWA LOGIKA: Używamy dedykowanego RPC ORAZ usuwamy ze Storage
    const removeImages = async (id: string, imageIds: string[], item: Row) => {
        if (!imageIds?.length) return
        
        // 1. Znajdź ścieżki do usunięcia ze Storage
        const pathsToDelete = (item.item_images ?? [])
            .filter(img => imageIds.includes(String(img.id)))
            .map(img => img.storage_path)
            .filter(p => !!p) as string[] // Filtrujemy tylko te, które mają ścieżkę (nie są blobami)

        const before = rows

        // 2. Optymistyczny update: usuń lokalnie
        setRows(prev =>
            prev.map(r =>
                r.id === id
                    ? {
                          ...r,
                          item_images: (r.item_images ?? []).filter(im => !imageIds.includes(String(im.id))),
                      }
                    : r
            )
        )

        try {
             // 3. ⭐️ FIZYCZNE USUNIĘCIE Z SUPABASE STORAGE
            if (pathsToDelete.length > 0) {
                await removeFiles(pathsToDelete);
            }
            
            // 4. Usunięcie z bazy danych (RPC zwraca text[])
            await removeItemAttachments(id, imageIds)
            // Nie musimy aktualizować stanu 'saved', bo optymistyczny update już to zrobił.
            
        } catch (e) {
            logSbError('[useItems] removeImages failed', e)
            setRows(before) // rollback stanu UI
            throw e
        }
    }

    return {
        rows,
        setRow,
        setAndCommit,
        addItem,
        removeItem,
        fileInputs,
        openPicker,
        onSelectFiles,
        onDrop,
        addImages,
        removeImages,
    }
}