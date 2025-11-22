'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { Tag } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import ItemsListRow from './ItemsListRow'
import ItemsListSummary from './ItemsListSummary'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import type { ItemsPanelRowDB as Item, ClientFile } from '../clientOrderTypes'
import { getQty, getUnitValuePLN, getWeightKg } from './ItemsList.shared'
import { supabase } from '@/utils/supabase/client'

type Props = {
    items?: Item[]
    onAddItem?: () => void | Promise<void>
    onUpdateItem?: (item_id: string, patch: Partial<Item>) => void | Promise<void>
    onDeleteItem?: (item_id: string) => void | Promise<void>
    onAddImages?: (item_id: string, files: FileList) => void | Promise<void>
    onRemoveImage?: (item_id: string, image_id: string | number) => void | Promise<void>
    onThumbClick?: (item_id: string, image: ClientFile) => void
}

export default function ItemsListPanel({
    items = [],
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onAddImages,
    onRemoveImage,
    onThumbClick,
}: Props) {
    const cleanItems = useMemo(() => (items ?? []).filter(Boolean) as Item[], [items])

    const summary = useMemo(() => {
        let totalItems = 0,
            totalQty = 0,
            totalValue = 0,
            totalWeight = 0
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
        const local = (att as any)?.file_url as string | undefined
        if (local) return local

        if (!att.id) return null

        // 🛑 POPRAWKA: file_id zamiast attachment_id
        const { data, error } = await supabase.functions.invoke('user_order_file_get_url', {
            body: { file_id: att.id }, 
        })

        if (error) {
            console.error('Preview Error:', error)
            return null
        }

        return data?.url || null
    }, [])

    const handleThumb = useCallback(
        (item_id: string, img: ClientFile) => {
            if (onThumbClick) return onThumbClick(item_id, img)
            ;(async () => {
                const url = await resolvePreviewUrl(img)
                if (url) setPreviewUrl(url)
            })()
        },
        [onThumbClick, resolvePreviewUrl]
    )

    return (
        <UniversalDetail
            title='Items'
            icon={<Tag className='h-5 w-5' />}
            className='bg-white border-light-blue'
            collapsible
            defaultOpen
            defaultOpenMobile={false}>
            <div data-no-toggle='true' className='mb-3'>
                <ItemsListSummary
                    totalItems={summary.totalItems}
                    totalQty={summary.totalQty}
                    totalValue={summary.totalValue}
                    totalWeight={summary.totalWeight}
                    onAddItem={() => {
                        void onAddItem?.()
                    }}
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
                            onUpdateItem={(id, patch) => {
                                void onUpdateItem?.(String(id), patch)
                            }}
                            onDeleteItem={id => {
                                void onDeleteItem?.(String(id))
                            }}
                            onAddImages={(id, files) => {
                                void onAddImages?.(String(id), files)
                            }}
                            onRemoveImage={(id, imgId) => {
                                void onRemoveImage?.(String(id), imgId)
                            }}
                            onThumbClick={handleThumb}
                        />
                    ))}
                </div>
            )}

            <UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />
        </UniversalDetail>
    )
}