'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { Tag } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import ItemsListRow from './ItemsListRow'
import ItemsListSummary from './ItemsListSummary'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import { getQty, getUnitValuePLN, getWeightKg } from './ItemsList.shared'
import { supabase } from '@/utils/supabase/client'
import type { ClientFile } from '../../clientOrderTypes'

// Hooks
import { useClientOrderModalCtx } from '../../ClientOrderModal.ctx'
import { useItems } from '../../hooks/useItems'

export default function ItemsListPanel() {
    const { data, ui } = useClientOrderModalCtx()
    const { addItem, updateItem, deleteItem, addImages, removeImages } = useItems()

    const items = data?.itemsPanel || []
    const cleanItems = useMemo(() => items.filter(Boolean), [items])
    const canEdit = ui.canEdit // Flaga z useOrderUI (blokada edycji jak submitted)

    const summary = useMemo(() => {
        let totalItems = 0, totalQty = 0, totalValue = 0, totalWeight = 0
        for (const r of cleanItems) {
            totalItems++
            const q = getQty(r)
            totalQty += q
            totalValue += (getUnitValuePLN(r) || 0) * q
            totalWeight += (getWeightKg(r) || 0) * q
        }
        return { totalItems, totalQty, totalValue, totalWeight }
    }, [cleanItems])

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const resolvePreviewUrl = useCallback(async (att: ClientFile): Promise<string | null> => {
        const local = (att as any)?.file_url
        if (local) return local
        if (!att.id) return null
        
        // Atomic Logic: get from R2
        const { data, error } = await supabase.functions.invoke('user_order_file_get_url', {
            body: { file_id: att.id },
        })
        if (error) {
            console.error('Preview Error:', error)
            return null
        }
        return data?.url || null
    }, [])

    const handleThumb = useCallback((item_id: string, img: ClientFile) => {
        (async () => {
            const url = await resolvePreviewUrl(img)
            if (url) setPreviewUrl(url)
        })()
    }, [resolvePreviewUrl])

    return (
        <UniversalDetail
            title='Items'
            icon={<Tag className='h-5 w-5' />}
            className='bg-white border-light-blue'
            collapsible
            defaultOpen={true} // Domyślnie otwarte
            defaultOpenMobile={false}
        >
            <div data-no-toggle='true' className='mb-3'>
                <ItemsListSummary
                    totalItems={summary.totalItems}
                    totalQty={summary.totalQty}
                    totalValue={summary.totalValue}
                    totalWeight={summary.totalWeight}
                    onAddItem={canEdit ? () => void addItem() : undefined}
                />
            </div>

            {cleanItems.length === 0 ? (
                <div className='p-4 text-[14px] text-middle-blue/75 bg-middle-blue/3 w-full border border-middle-blue/20 rounded-md'>
                    No items added yet.
                </div>
            ) : (
                <div className='flex flex-col gap-3'>
                    {cleanItems.map((it, idx) => (
                        <ItemsListRow
                            key={String(it.id ?? idx)}
                            item={it}
                            alt={idx % 2 === 1}
                            canEdit={canEdit} 
                            onUpdateItem={(id, patch) => updateItem(id, patch)}
                            onDeleteItem={(id) => deleteItem(id)}
                            onAddImages={(id, files) => addImages(id, Array.from(files))}
                            onRemoveImage={(id, imgId) => removeImages(String(id), [String(imgId)])}
                            onThumbClick={handleThumb}
                        />
                    ))}
                </div>
            )}

            <UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />
        </UniversalDetail>
    )
}