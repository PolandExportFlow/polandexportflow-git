'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Hash, Globe, Plus, X as XIcon, Loader2, PackageMinus } from 'lucide-react'
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { ensurePreviewableImages, DEFAULTS as IMG_DEFAULTS } from '@/utils/convertImages'
import { supabase } from '@/utils/supabase/client'
import type { ClientFile } from '../clientOrderTypes'

type Props = {
    order_number?: string | null
    order_status: OrderStatus | string
    order_type?: string | null
    order_note?: string | null
    files?: ClientFile[]
    onSaveNote?: (note: string) => Promise<void> | void
    onAddFiles?: (files: File[]) => Promise<void> | void
    onDeleteAttachment?: (file: ClientFile) => Promise<void> | void
    onRefresh?: () => Promise<void> | void
    onDeleteOrder?: () => Promise<void> | void
    canDeleteOrder?: boolean
}

type UIFile = ClientFile & { file_url?: string | null }

// ✅ POPRAWKA: Używamy kompatybilnego generatora krótkiego ID
const generateShortId = (): string => Math.random().toString(36).substring(2, 5);

// ✅ POPRAWKA: safeUUID używa kompatybilnego generatora
const safeUUID = (): string => `temp-${generateShortId()}`; 

const isImage = (a: { file_name?: string | null; mime_type?: string | null }) => {
    const name = (a.file_name || '').toLowerCase()
    const mime = (a.mime_type || '').toLowerCase()
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(name)
}

const isPreviewableInline = (a: UIFile) => isImage(a)

const formatBytes = (n?: number | null) => {
    if (!n || n <= 0) return ''
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let v = n
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
    }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

export default function StatusPanel({
    order_number,
    order_status,
    order_type,
    order_note: initialNote = '',
    files = [],
    onSaveNote,
    onAddFiles,
    onDeleteAttachment,
    onDeleteOrder,
    canDeleteOrder = true,
}: Props) {
    const getOrderCfg = useCallback((s: unknown) => getStatusConfig(String(s || 'created') as OrderStatus), [])

    const [note, setNote] = useState(initialNote || '')
    const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    useEffect(() => {
        const next = initialNote || ''
        setNote(prev => (prev === next ? prev : next))
    }, [initialNote])

    const saveIfChanged = useCallback(async () => {
        const curr = (note || '').trim()
        const base = (initialNote || '').trim()
        if (curr === base || !onSaveNote) return
        try {
            setSaving('saving')
            await onSaveNote(curr)
            setSaving('saved')
            setTimeout(() => setSaving('idle'), 1000)
        } catch {
            setSaving('error')
            setTimeout(() => setSaving('idle'), 1200)
        }
    }, [note, initialNote, onSaveNote])

    const [list, setList] = useState<UIFile[]>(files as UIFile[])
    const fileRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [confirmFile, setConfirmFile] = useState<UIFile | null>(null)
    const [uploadErr, setUploadErr] = useState<string | null>(null)
    const tempBlobUrls = useRef<Map<string, string>>(new Map())
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
    const isLoadingId = (id: string | number) => loadingIds.has(String(id))

    useEffect(() => {
        setList(prev => {
            const temps = prev.filter(a => String(a.id).startsWith('temp-'))
            const mergedMap = new Map<string, UIFile>()
            for (const a of temps) mergedMap.set(String(a.id), a)
            for (const a of files as UIFile[]) mergedMap.set(String(a.id), a)
            const merged = Array.from(mergedMap.values())
            merged.sort((a, b) => {
                if (String(a.id).startsWith('temp-')) return -1
                if (String(b.id).startsWith('temp-')) return 1
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            })
            return merged
        })
    }, [files])

    useEffect(() => {
        const currentIds = new Set(list.map(a => String(a.id)))
        for (const [id, url] of tempBlobUrls.current.entries()) {
            if (!currentIds.has(id)) {
                URL.revokeObjectURL(url)
                tempBlobUrls.current.delete(id)
            }
        }
    }, [list])

    useEffect(
        () => () => {
            for (const [, url] of tempBlobUrls.current.entries()) URL.revokeObjectURL(url)
            tempBlobUrls.current.clear()
        },
        []
    )

    const [signedMap, setSignedMap] = useState<Record<string, string>>({})
    useEffect(() => {
        let cancelled = false
        async function ensureSigned() {
            const pairs = await Promise.all(
                list.map(async (f, idx) => {
                    const key = String(f.id ?? idx)
                    const raw = f.storage_path || ''
                    const fileUrl = f.file_url
                    if (fileUrl && String(fileUrl).startsWith('blob:')) return [key, fileUrl] as const
                    if (/^https?:\/\//i.test(raw)) return [key, raw] as const
                    if (raw && f.id && !String(f.id).startsWith('temp-')) {
                        try {
                            const { data, error } = await supabase.functions.invoke('user_order_file_get_url', {
                                body: { file_id: f.id },
                            })
                            if (!error && data?.url) return [key, data.url] as const
                        } catch {}
                    }
                    return [key, ''] as const
                })
            )
            if (cancelled) return
            const next: Record<string, string> = {}
            for (const [k, v] of pairs) if (v) next[k] = v
            setSignedMap(next)
        }
        void ensureSigned()
        return () => {
            cancelled = true
        }
    }, [list])

    const openPicker = () => fileRef.current?.click()

    const optimisticSkeletons = useCallback((files: File[]) => {
        const ids: string[] = []
        const now = new Date().toISOString()
        const temps: UIFile[] = files.map(f => {
            // POPRAWKA: Użycie bezpiecznego safeUUID
            const id = safeUUID() 
            ids.push(id)
            return {
                id,
                file_url: '',
                file_name: f.name,
                mime_type: 'pef/loading',
                file_size: f.size,
                created_at: now,
                storage_path: null,
            } as unknown as UIFile
        })
        setList(curr => [...temps, ...curr])
        setLoadingIds(prev => new Set([...prev, ...ids]))
        return ids
    }, [])

    const fillSkeletonsWithPreview = useCallback((ids: string[], files: File[]) => {
        setList(curr => {
            const byId = new Map(curr.map(x => [String(x.id), x]))
            const n = Math.min(ids.length, files.length)
            for (let i = 0; i < n; i++) {
                const id = ids[i]
                const f = files[i]
                const url = URL.createObjectURL(f)
                tempBlobUrls.current.set(id, url)
                const prev = byId.get(id)
                if (prev) {
                    byId.set(id, {
                        ...prev,
                        file_url: url,
                        file_name: f.name,
                        mime_type: f.type || 'image/jpeg',
                        file_size: f.size,
                        created_at: prev.created_at, // Utrzymujemy stary created_at
                        storage_path: prev.storage_path, // Utrzymujemy storage_path
                    } as UIFile)
                }
            }
            return Array.from(byId.values())
        })
    }, [])

    const removeTemps = (ids: string[]) => {
        setList(curr => curr.filter(a => !ids.includes(String(a.id))))
        setLoadingIds(prev => {
            const p = new Set(prev)
            ids.forEach(id => p.delete(id))
            return p
        })
    }

    const MAX_FILE = 25 * 1024 * 1024

    const handleUpload = useCallback(
        async (files: File[]) => {
            if (!files.length) return
            setUploadErr(null)
            const allowed = files.filter(f => f.size <= MAX_FILE)
            if (allowed.length !== files.length) setUploadErr(`Some files exceed 25MB.`)
            if (!allowed.length) return

            const skeletonIds = optimisticSkeletons(allowed)
            let previewables: File[] = allowed
            try {
                previewables = await ensurePreviewableImages(allowed, IMG_DEFAULTS)
            } catch {}
            fillSkeletonsWithPreview(skeletonIds, previewables)

            try {
                await onAddFiles?.(allowed)
                removeTemps(skeletonIds)
            } catch (err) {
                removeTemps(skeletonIds)
                const msg = err instanceof Error ? err.message : 'Upload failed.'
                setUploadErr(msg)
            }
        },
        [optimisticSkeletons, fillSkeletonsWithPreview, onAddFiles]
    )

    const onFilesSelected: React.ChangeEventHandler<HTMLInputElement> = async e => {
        const files = Array.from(e.currentTarget.files ?? [])
        if (fileRef.current) fileRef.current.value = ''
        if (files.length) await handleUpload(files)
    }

    const onDrop: React.DragEventHandler<HTMLDivElement> = async e => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const files = Array.from(e.dataTransfer.files || [])
        if (files.length) await handleUpload(files)
    }
    const onDragOver: React.DragEventHandler<HTMLDivElement> = e => {
        e.preventDefault()
        setDragOver(true)
    }
    const onDragLeave: React.DragEventHandler<HTMLDivElement> = e => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDragOver(false)
    }
    const onKeyUpload: React.KeyboardEventHandler<HTMLDivElement> = e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
        }
    }

    const handleDelete = useCallback(
        async (file: UIFile) => {
            if (isLoadingId(file.id)) return
            if (String(file.id).startsWith('temp-')) {
                removeTemps([String(file.id)])
                return
            }
            try {
                setList(curr => curr.filter(a => a.id !== file.id))
                await onDeleteAttachment?.(file)
            } catch {}
        },
        [onDeleteAttachment]
    )

    const headerBadge = useMemo(
        () => <UniversalStatusBadge status={order_status} getConfig={getOrderCfg} />,
        [order_status, getOrderCfg]
    )
    const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(false)

    return (
        <UniversalDetail
            title='Status'
            icon={<BadgeCheck className='h-5 w-5' />}
            className='bg-white border-light-blue'
            collapsible
            defaultOpen
            defaultOpenMobile={false}
            headerExtra={<div className='mr-3'>{headerBadge}</div>}>
            <DetailRow icon={<Globe className='w-4 h-4' />} label='Service Type' value={order_type || '—'} />
            <DetailRow icon={<BadgeCheck className='w-4 h-4' />} label='Status' value={headerBadge} />
            <DetailRow
                icon={<Hash className='w-4 h-4' />}
                label='Order Number'
                value={order_number || '—'}
                className='!border-b-0'
            />

            <div className='mt-6 bg-ds-light-blue rounded-md p-4'>
                <div className='mb-2 flex items-center justify-between'>
                    <label className='text-[13px] opacity-70'>Additional note</label>
                    <div className='text-[12px] text-middle-blue/70 h-4'>
                        {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved.' : saving === 'error' ? 'Error.' : ''}
                    </div>
                </div>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onBlur={() => void saveIfChanged()}
                    placeholder='Type your message here…'
                    className='w-full rounded-lg p-5 text-[14px] leading-relaxed outline-none min-h-[88px]'
                    rows={4}
                />
            </div>

            <hr className='my-6 border-light-blue/50' />

            <div className='mt-4 mb-4 bg-ds-light-blue rounded-md p-4'>
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={openPicker}
                    onKeyDown={onKeyUpload}
                    role='button'
                    tabIndex={0}
                    className={`w-full rounded-md border border-dashed border-middle-blue/30 bg-white cursor-pointer transition-all ${
                        dragOver ? 'bg-middle-blue/10' : 'hover:bg-middle-blue/5'
                    } px-4 py-3 grid place-items-center select-none caret-transparent`}
                    title='Drag & drop files'>
                    <input ref={fileRef} type='file' multiple className='hidden' onChange={onFilesSelected} />
                    <span className='inline-flex items-center gap-2 text-[12px] md:text-[15px] text-middle-blue/50 py-4'>
                        <Plus className='h-4 w-4' /> Attach files
                    </span>
                </div>

                {uploadErr && <div className='mt-2 text-[13px] text-red'>{uploadErr}</div>}

                {list.length > 0 ? (
                    <div className='mt-3 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2'>
                        {list.map((f, i) => {
                            const fname = f.file_name || 'File'
                            const idStr = String(f.id ?? i)
                            const href = signedMap[idStr] || f.file_url || ''
                            const isImg = isPreviewableInline(f)
                            const loading = isLoadingId(f.id) || f.mime_type === 'pef/loading' || (isImg && !href)

                            return (
                                <div
                                    key={idStr}
                                    className='group relative w-full aspect-square rounded-md border border-middle-blue/15 bg-white overflow-visible'
                                    title={fname}>
                                    {isImg ? (
                                        // Jeśli to obrazek, renderujemy button z img. Jeśli href pusty, img się nie pokaże (lub będzie przezroczysty),
                                        // ale nie wpadniemy do bloku 'else' z nazwą pliku.
                                        <button
                                            type='button'
                                            className='block relative h-full w-full text-left rounded-md overflow-hidden'
                                            onClick={() => !loading && setPreviewUrl(href)}
                                            disabled={loading}>
                                            {href && (
                                                <img
                                                    src={href}
                                                    alt={fname}
                                                    className={`absolute inset-0 h-full w-full object-cover transition ${
                                                        loading ? 'opacity-0' : 'opacity-100 group-hover:brightness-90'
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    ) : (
                                        // Tylko dla plików nie-obrazkowych (PDF, DOCX)
                                        <div className='h-full w-full rounded-md overflow-hidden bg-middle-blue/8 grid place-items-center p-2'>
                                            <span className='text-[10px] text-middle-blue/60 text-center break-words line-clamp-3 leading-tight'>
                                                {fname}
                                            </span>
                                        </div>
                                    )}

                                    {/* LOADER: Zawsze na wierzchu jeśli loading */}
                                    {loading && (
                                        <div className='absolute inset-0 bg-white/80 backdrop-blur-[1px] grid place-items-center z-10 rounded-md'>
                                            <Loader2 className='h-6 w-6 animate-spin text-middle-blue' />
                                        </div>
                                    )}

                                    {!loading && (
                                        <button
                                            type='button'
                                            onClick={e => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setConfirmFile(f)
                                            }}
                                            className={`absolute -top-2 -right-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg transition-colors duration-200 bg-middle-blue hover:bg-red opacity-100 md:opacity-0 md:group-hover:opacity-100`}>
                                            <XIcon className='h-3.5 w-3.5' />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <label className='block mt-4 text-[13px] opacity-70'>No files yet.</label>
                )}
            </div>

            <hr className='my-6 border-light-blue/50' />

            <div className='mt-4 mb-4 bg-ds-light-blue rounded-md p-4'>
                <button
                    type='button'
                    onClick={() => setConfirmDeleteOrder(true)}
                    className='w-full flex items-center justify-center gap-2 rounded-lg border border-middle-blue/20 bg-white px-6 py-4 text-[12px] md:text-[14px] font-heebo_medium text-middle-blue/70 hover:bg-[#FFF5F5] hover:text-[#DC2626] hover:border-[#FEE2E2] transition-colors duration-300 disabled:opacity-40'
                    disabled={!canDeleteOrder}>
                    <PackageMinus className='w-4 h-4' /> Close Order
                </button>
            </div>

            {previewUrl && <UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />}
            <UniversalConfirmModal
                open={!!confirmFile}
                title='Delete file?'
                description='This action cannot be undone.'
                confirmText='Delete'
                cancelText='Cancel'
                tone='danger'
                onConfirm={async () => {
                    const file = confirmFile as ClientFile
                    setConfirmFile(null)
                    if (file) await handleDelete(file as UIFile)
                }}
                onCancel={() => setConfirmFile(null)}
            />
            <UniversalConfirmModal
                open={confirmDeleteOrder}
                title='Close this order?'
                description='Irreversible action.'
                confirmText='Yes, close order'
                cancelText='Cancel'
                tone='danger'
                onConfirm={async () => {
                    setConfirmDeleteOrder(false)
                    await onDeleteOrder?.()
                }}
                onCancel={() => setConfirmDeleteOrder(false)}
            />
        </UniversalDetail>
    )
}