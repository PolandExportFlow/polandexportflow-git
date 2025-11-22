// components/dashboard/admin/common/AdminOrderModal/panels/ItemsPanel/ItemsPanel.tsx (CZYSTA WERSJA)
'use client'

import React, { useMemo, useState } from 'react'
import { Tag } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import ItemsPanelSummary from './ItemsPanelSummary'
import ItemsRow from './ItemsRow'
import type { OrderItem, ItemImage } from '../../AdminOrderTypes'
import type { ItemAttachmentPayload } from './items.service' // Tylko typ
import { useItems } from '../../hooks/useItems'
// ⭐️ IMPORTUJEMY HELPERSY ZE STORAGE (zamiast klienta supabase)
import { uploadItemFiles } from '@/utils/supabase/files'
// ⭐️ IMPORTUJEMY KONWERSJĘ HEIC (Kluczowa poprawka)
// import { ensurePreviewableImages } from '@/utils/convertImages' // Zakładamy, że jest importowany w files.ts
import { logSbError } from '@/utils/supabase/errors'

type Props = {
    orderId: string
    orderNumber: string
    items?: OrderItem[]
}

export default function ItemsPanel({ orderId, orderNumber, items = [] }: Props) {
    const {
        rows,
        setAndCommit,
        addItem,
        removeItem,
        onSelectFiles,
        onDrop,
        fileInputs,
        openPicker,
        addImages, // ⬅️ Funkcja z useItems
        removeImages, // ⬅️ Funkcja z useItems
    } = useItems({ orderId, items }) 

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const summary = useMemo(() => {
        const totalItems = rows.length
        const totalQty = rows.reduce((s, r: any) => s + (Number(r.item_quantity) || 0), 0)
        const totalValue = rows.reduce((s, r: any) => s + (Number(r.item_value) || 0) * (Number(r.item_quantity) || 1), 0)
        const totalWeight = rows.reduce((s, r: any) => s + (Number(r.item_weight) || 0) * (Number(r.item_quantity) || 1), 0)
        return { totalItems, totalQty, totalValue, totalWeight }
    }, [rows])

    // ⬇️ KLUCZ: Używamy czystej funkcji z `files.ts` ORAZ konwersji
    const onUploadImages = async (itemId: string, files: File[]) => {
        try {
            // 1. ⭐️ ZNAJDUJEMY ITEM_NUMBER (PEF-XXX) NA PODSTAWIE UUID (itemId)
            const row = rows.find((r: any) => r.id === itemId);
            
            // ⭐️ KLUCZOWA ZMIANA: Używamy item_number LUB (jeśli jeszcze nie ma) samego itemId (UUID) jako fallback
            // To jest nasz identyfikator folderu
            const itemIdentifier = row?.item_number || itemId; 

            // 2. ⭐️ UPLOAD DO STORAGE (Przekazujemy poprawny itemIdentifier)
            // Funkcja uploadItemFiles zajmie się konwersją HEIC (zgodnie z poprawką w files.ts)
            const uploadResults = await uploadItemFiles(orderNumber, itemIdentifier, files);

            // 3. Przygotuj payload dla bazy danych
            const payload: ItemAttachmentPayload = uploadResults.map(r => ({
                id: crypto.randomUUID(), // Generujemy ID dla bazy danych
                storage_path: r.path, // ⬅️ Ta ścieżka jest teraz poprawna
                file_name: r.file_name,
                mime: r.mime,
                file_size: r.size,
                created_at: new Date().toISOString(),
            }));

            // 4. ⭐️ Zapisz w bazie danych (przez hooka)
            // (useItems zapisze payload w order_items_attachments)
            await addImages(itemId, payload);
        
        } catch (error) {
            logSbError('[ItemsPanel] onUploadImages failed', error)
            // (useItems hook zajmie się rollbackiem optymistycznego UI)
            // Rzucamy błąd, aby useItems (w onSelectFiles) mógł go obsłużyć i wyłączyć 'busy'
            throw error; 
        }
    }

    // ⭐️ Czysta funkcja przekazująca do hooka
    const handleRemoveImage = (itemId: string, imageId: string | number, item: OrderItem) => {
        return removeImages(itemId, [String(imageId)], item);
    }

    return (
        <UniversalDetail
            title="Pozycje w zamówieniu"
            icon={<Tag className="h-5 w-5" />}
            className="bg-white border-light-blue"
            collapsible
            defaultOpen
            defaultOpenMobile={false}
        >
            <div data-no-toggle="true" className="mb-3">
                <ItemsPanelSummary
                    totalItems={summary.totalItems}
                    totalQty={summary.totalQty}
                    totalValue={summary.totalValue}
                    totalWeight={summary.totalWeight}
                    onAddItem={() => addItem()}
                />
            </div>

            {rows.length === 0 ? (
                <div className="p-4 text-[14px] text-middle-blue/75 bg-middle-blue/3 w-full border border-middle-blue/20 rounded-md">
                    Brak pozycji.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {rows.map((r: any, idx) => (
                        <ItemsRow
                            key={r.id}
                            item={{
                                id: r.id,
                                order_id: r.order_id,
                                item_number: r.item_number ?? null,
                                item_name: r.item_name ?? '',
                                item_url: r.item_url ?? '',
                                item_value: Number(r.item_value ?? 0),
                                item_quantity: Number(r.item_quantity ?? 1),
                                item_weight: Number(r.item_weight ?? 0),
                                dimensions: {
                                    item_width: Number(r.dimensions?.item_width ?? r.item_width ?? 0),
                                    item_height: Number(r.dimensions?.item_height ?? r.item_height ?? 0),
                                    item_length: Number(r.dimensions?.item_length ?? r.item_length ?? 0),
                                },
                                item_status: (r.item_status as any) ?? 'none',
                                item_note: r.item_note ?? '',
                                item_images: (r.item_images ?? []) as ItemImage[],
                                payment_currency: r.payment_currency ?? 'PLN'
                            } as OrderItem}
                            alt={idx % 2 === 1}
                            
                            onUpdateItem={(id, patch) => {
                                return setAndCommit(String(id), patch)
                            }}
                            
                            onAddImages={async (id, fileList) => {
                                const files = Array.from(fileList || [])
                                // ⭐️ Poprawka: onSelectFiles z hooka wymaga przekazania funkcji uploadu
                                await onSelectFiles(String(id), fileList, onUploadImages) 
                            }}
                            
                            // ⭐️ Przekazujemy wywołanie do handleRemoveImage
                            onRemoveImage={(id, imageId, item) => { // item jest już przekazywany z ItemsRow
                                handleRemoveImage(String(id), imageId, item);
                            }}
                            
                            onThumbClick={(_, img) => setPreviewUrl(String(img?.file_url || ''))}
                            onDeleteItem={async (id) => removeItem(String(id))}
                            openPicker={(id) => openPicker(String(id))}
                            fileInputRefCb={(id, node) => { fileInputs.current[String(id)] = node }}
                            // ⭐️ Poprawka: onDrop z hooka wymaga przekazania funkcji uploadu
                            onDrop={(id, e) => onDrop(String(id), e, onUploadImages)}
                        />
                    ))}
                </div>
            )}

            <UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />
        </UniversalDetail>
    )
}