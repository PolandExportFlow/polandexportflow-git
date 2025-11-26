'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { 
    BadgeCheck, Hash, Globe, Plus, X as XIcon, Loader2, PackageMinus, Send, Undo2, 
    MessageSquareText, Paperclip, UploadCloud 
} from 'lucide-react'
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { supabase } from '@/utils/supabase/client'
import type { ClientFile } from '../clientOrderTypes'

// Hooks
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import { useStatus } from '../hooks/useStatus'

type UIFile = ClientFile & { file_url?: string | null }
const safeUUID = (): string => `temp-${Math.random().toString(36).substring(2, 8)}`
const isImage = (a: { file_name?: string | null; mime_type?: string | null }) => {
    const name = (a.file_name || '').toLowerCase()
    const mime = (a.mime_type || '').toLowerCase()
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(name)
}
const isPreviewableInline = (a: UIFile) => isImage(a)

export default function StatusPanel() {
    // ✅ 1. Pobieramy onOrderDeleted
    const { data, ui, onOrderDeleted } = useClientOrderModalCtx()
    const { setOrderNote, addAttachments, deleteAttachment, deleteOrder, submitOrder, unsubmitOrder } = useStatus()

    const statusPanel = data?.statusPanel
    if (!statusPanel) return null

    const { order_number, order_status, order_type, order_note: initialNote, files } = statusPanel

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
        if (curr === base) return
        try {
            setSaving('saving')
            await setOrderNote(curr)
            setSaving('saved')
            setTimeout(() => setSaving('idle'), 1000)
        } catch {
            setSaving('error')
            setTimeout(() => setSaving('idle'), 1200)
        }
    }, [note, initialNote, setOrderNote])

    const [list, setList] = useState<UIFile[]>(files as UIFile[])
    const fileRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [confirmFile, setConfirmFile] = useState<UIFile | null>(null)
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

    useEffect(() => () => {
        for (const [, url] of tempBlobUrls.current.entries()) URL.revokeObjectURL(url)
        tempBlobUrls.current.clear()
    }, [])

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
        return () => { cancelled = true }
    }, [list])

    const removeTemps = (ids: string[]) => {
        setList(curr => curr.filter(a => !ids.includes(String(a.id))))
        setLoadingIds(prev => {
            const p = new Set(prev)
            ids.forEach(id => p.delete(id))
            return p
        })
    }

    const handleUpload = async (newFiles: File[]) => {
        if (!newFiles.length) return
        
        const ids: string[] = []
        const temps: UIFile[] = newFiles.map(f => {
            const id = safeUUID()
            ids.push(id)
            const url = URL.createObjectURL(f)
            tempBlobUrls.current.set(id, url)
            return { 
                id, 
                file_name: f.name, 
                mime_type: f.type || 'image/jpeg', 
                file_size: f.size, 
                created_at: new Date().toISOString(), 
                file_url: url,
                storage_path: null 
            } as unknown as UIFile
        })

        setList(prev => [...temps, ...prev])
        setLoadingIds(prev => new Set([...prev, ...ids]))
        
        try {
            await addAttachments(newFiles)
            removeTemps(ids) 
        } catch (e) {
            console.error(e)
            removeTemps(ids)
        }
    }

    const handleDelete = async (file: UIFile) => {
        if (isLoadingId(file.id)) return
        if (String(file.id).startsWith('temp-')) {
            removeTemps([String(file.id)])
            return
        }
        try {
            setList(curr => curr.filter(a => a.id !== file.id))
            await deleteAttachment(file)
        } catch (e) {
            console.error(e)
        }
    }

    const [confirmAction, setConfirmAction] = useState<'deleteOrder' | 'submit' | null>(null)

    const headerBadge = useMemo(
        () => <UniversalStatusBadge status={order_status} getConfig={getOrderCfg} />,
        [order_status, getOrderCfg]
    )

    return (
        <UniversalDetail
            title='Status'
            icon={<BadgeCheck className='h-5 w-5' />}
            className='bg-white border-light-blue'
            collapsible
            defaultOpen={false}
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

            {/* --- NOTATKA --- */}
            <div className='mt-6 bg-ds-light-blue rounded-md p-4 md:p-5'>
                <div className='flex items-center justify-between mb-4 min-h-[20px]'>
                    <div className='flex items-start gap-2 min-h-[20px] text-middle-blue/80'>
                        <MessageSquareText className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                        <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                            Additional information regarding the order
                        </span>
                    </div>
                    <div className='text-[12px] text-middle-blue/70 h-4 leading-none flex items-center'>
                        {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved.' : ''}
                    </div>
                </div>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onBlur={() => void saveIfChanged()}
                    disabled={!ui.canEdit}
                    placeholder={ui.canEdit ? 'Type your message here…' : 'No notes.'}
                    className='w-full block m-0 rounded-lg p-4 text-[14px] leading-relaxed outline-none min-h-[88px] disabled:bg-transparent disabled:p-0 disabled:resize-none bg-white border border-middle-blue/10 focus:border-middle-blue/30 transition-colors'
                    rows={4}
                />
            </div>

            {/* --- PLIKI --- */}
            {ui.canEdit && (
                <div className='mt-4 mb-4 bg-ds-light-blue rounded-md p-4 md:p-5'>
                    <div className='flex items-center justify-between mb-4 min-h-[20px]'>
                        <div className='flex items-start gap-2 text-middle-blue/80'>
                            <Paperclip className='w-4 h-4 opacity-70 shrink-0 m-0.5' />
                            <span className='text-[13px] font-made_light tracking-wide leading-none pt-[3px]'>
                                Attach files related to the order
                            </span>
                        </div>
                    </div>
                    
                    <div 
                        onClick={() => fileRef.current?.click()} 
                        className='w-full cursor-pointer py-9 text-center border-2 border-dashed border-middle-blue/25 rounded-lg bg-white hover:border-middle-blue/50 hover:bg-white/80 transition-all m-0 flex flex-col items-center gap-4'
                    >
                        <UploadCloud className='w-6 h-6 text-middle-blue' />
                        <span className='text-[13px] text-middle-blue/70 font-medium'>
                            Drag & drop files here or click to browse
                        </span>
                        <input ref={fileRef} type='file' multiple className='hidden' onChange={e => handleUpload(Array.from(e.target.files || []))} />
                    </div>
                </div>
            )}
            
            {/* Lista plików */}
            {list.length > 0 && (
                <div className='mt-3 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 mb-4'>
                    {list.map((f, i) => {
                        const fname = f.file_name || 'File'
                        const idStr = String(f.id ?? i)
                        const href = signedMap[idStr] || f.file_url || ''
                        const isImg = isPreviewableInline(f)
                        const loading = isLoadingId(f.id) || f.mime_type === 'pef/loading' || (isImg && !href)

                        return (
                            <div key={idStr} className='group relative w-full aspect-square rounded-md border border-middle-blue/15 bg-white overflow-visible' title={fname}>
                                {isImg ? (
                                    <button
                                        type='button'
                                        className='block relative h-full w-full text-left rounded-md overflow-hidden'
                                        onClick={() => !loading && setPreviewUrl(href)}
                                        disabled={loading}
                                    >
                                        {href && (
                                            <img
                                                src={href}
                                                alt={fname}
                                                className={`absolute inset-0 h-full w-full object-cover transition ${loading ? 'opacity-0' : 'opacity-100 group-hover:brightness-90'}`}
                                            />
                                        )}
                                    </button>
                                ) : (
                                    <div className='h-full w-full rounded-md overflow-hidden bg-middle-blue/8 grid place-items-center p-2'>
                                        <span className='text-[10px] text-middle-blue/60 text-center break-words line-clamp-3 leading-tight'>{fname}</span>
                                    </div>
                                )}

                                {loading && (
                                    <div className='absolute inset-0 bg-white/80 backdrop-blur-[1px] grid place-items-center z-10 rounded-md'>
                                        <Loader2 className='h-6 w-6 animate-spin text-middle-blue' />
                                    </div>
                                )}

                                {!loading && ui.canEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setConfirmFile(f)
                                        }}
                                        className='absolute -top-2 -right-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg transition-colors duration-200 bg-middle-blue hover:bg-red opacity-100 md:opacity-0 md:group-hover:opacity-100'
                                    >
                                        <XIcon className='h-3.5 w-3.5' />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <hr className='my-6 border-light-blue/50' />

            {/* --- AKCJE --- */}
            <div className='flex flex-col gap-3'>
                {ui.canSubmit && (
                    <button
                        type='button'
                        onClick={() => setConfirmAction('submit')}
                        className='w-full flex items-center justify-center gap-3 rounded-xl bg-green text-white h-[54px] text-[15px] font-medium shadow-lg shadow-green/20 hover:bg-[#059669] hover:shadow-green/30 hover:-translate-y-0.5 transition-all duration-200'
                    >
                        <Send className='w-5 h-5' /> 
                        <span>Submit for Quote</span>
                    </button>
                )}

                {ui.canUnsubmit && (
                    <button
                        type='button'
                        onClick={async () => await unsubmitOrder()}
                        className='w-full flex items-center justify-center gap-3 rounded-xl border border-middle-blue/20 bg-white text-middle-blue h-[54px] text-[15px] font-medium hover:border-middle-blue/40 hover:bg-middle-blue/5 transition-all duration-200'
                    >
                        <Undo2 className='w-5 h-5' /> 
                        <span>Edit Order (Cancel Submission)</span>
                    </button>
                )}

                {ui.canEdit && (
                    <button
                        type='button'
                        onClick={() => setConfirmAction('deleteOrder')}
                        className='w-full flex items-center justify-center gap-3 rounded-xl border border-red/20 bg-white text-red h-[54px] text-[15px] font-medium hover:bg-red/5 hover:border-red/30 transition-all duration-200 mt-1'
                    >
                        <PackageMinus className='w-5 h-5' /> 
                        <span>Close Order</span>
                    </button>
                )}
            </div>

            {/* --- MODALE --- */}
            <UniversalConfirmModal
                open={confirmAction === 'submit'}
                title='Submit order?'
                description='Your order will be sent for pricing. You won’t be able to edit items until we review it.'
                confirmText='Yes, submit'
                cancelText='Cancel'
                onConfirm={async () => {
                    await submitOrder()
                    setConfirmAction(null)
                }}
                onCancel={() => setConfirmAction(null)}
            />

            <UniversalConfirmModal
                open={confirmAction === 'deleteOrder'}
                title='Close this order?'
                description='This is irreversible. All data will be lost.'
                confirmText='Yes, close order'
                cancelText='Cancel'
                tone='danger'
                onConfirm={async () => {
                    await deleteOrder()
                    setConfirmAction(null)
                    // ✅ 2. Zamknięcie modala po usunięciu
                    onOrderDeleted?.() 
                }}
                onCancel={() => setConfirmAction(null)}
            />
            
            <UniversalConfirmModal
                open={!!confirmFile}
                title='Delete file?'
                confirmText='Delete'
                tone='danger'
                onConfirm={async () => {
                    if(confirmFile) await handleDelete(confirmFile)
                    setConfirmFile(null)
                }}
                onCancel={() => setConfirmFile(null)}
            />

            {previewUrl && <UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </UniversalDetail>
    )
}