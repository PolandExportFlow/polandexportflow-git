// app/admin/components/sections/orders/panels/StatusPanel/Attachments.tsx
'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X as XIcon, Loader2 } from 'lucide-react'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import { ensurePreviewableImages, DEFAULTS as IMG_DEFAULTS } from '@/utils/convertImages'
import type { Attachment } from '../../AdminOrderTypes'
import { createSignedUrl } from '@/utils/supabase/files'

/* ===== POMOCNIKI Z WERSJI KLIENCKIEJ ===== */
type UIAttachment = Attachment & {
  file_url?: string | null
  file_size?: number | null
}

const safeUUID = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2)

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

const isImage = (a: { file_name?: string | null; mime_type?: string | null }) => {
  const name = (a.file_name || '').toLowerCase()
  const mime = (a.mime_type || '').toLowerCase()
  return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(name)
}
/* ========================================== */

type Props = {
  attachments: Attachment[]
  onAddFiles?: (files: File[]) => Promise<void> | void
  onDeleteAttachment?: (file: Attachment) => Promise<void> | void
  onRefresh?: () => Promise<void> | void
}

export default function Attachments({ attachments = [], onAddFiles, onDeleteAttachment }: Props) {
  const [list, setList] = useState<UIAttachment[]>(attachments as UIAttachment[])
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [confirmAttachment, setConfirmAttachment] = useState<UIAttachment | null>(null)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const tempBlobUrls = useRef<Map<string, string>>(new Map())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const isLoadingId = (id: string | number) => loadingIds.has(String(id))

  // ⭐️ ZMIANA 1: Główny useEffect musi zależeć TERAZ od loadingIds
  // Będzie poprawnie łączyć prawdziwe pliki z tymi, które są jeszcze wysyłane.
  useEffect(() => {
    setList(prev => {
      // 1. Weź tylko te pliki temp, które SĄ JESZCZE w trakcie ładowania
      const loadingTemps = prev.filter(a => {
        const id = String(a.id)
        return id.startsWith('temp-') && loadingIds.has(id)
      })

      // 2. Weź wszystkie prawdziwe pliki z bazy
      const realAttachments = (attachments || []) as UIAttachment[]

      // 3. Stwórz nową listę
      const newList = [...loadingTemps, ...realAttachments]

      // 4. Sortuj (temp na górze, reszta po dacie)
      newList.sort((a, b) => {
        const aIsTemp = String(a.id).startsWith('temp-')
        const bIsTemp = String(b.id).startsWith('temp-')
        if (aIsTemp && !bIsTemp) return -1
        if (!aIsTemp && bIsTemp) return 1
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })

      return newList
    })
  }, [attachments, loadingIds]) // ⭐️ Dodana zależność `loadingIds`

  // sprzątanie blob URL-i
  useEffect(() => {
    const currentIds = new Set(list.map(a => String(a.id)))
    for (const [id, url] of tempBlobUrls.current.entries()) {
      if (!currentIds.has(id)) {
        URL.revokeObjectURL(url)
        tempBlobUrls.current.delete(id)
      }
    }
  }, [list])

  useEffect(() => {
    return () => {
      for (const [, url] of tempBlobUrls.current.entries()) URL.revokeObjectURL(url)
      tempBlobUrls.current.clear()
    }
  }, [])

  const openPicker = () => fileRef.current?.click()

  // 1) Szkielety natychmiast
  const optimisticSkeletons = useCallback((files: File[]) => {
    const ids: string[] = []
    const now = new Date().toISOString()
    const temps: UIAttachment[] = files.map(f => {
      const id = `temp-${safeUUID()}`
      ids.push(id)
      return {
        id,
        file_url: '',
        file_name: f.name,
        mime_type: 'pef/loading',
        file_size: f.size,
        created_at: now,
        storage_path: '',
      }
    })
    setList(curr => [...temps, ...curr])
    setLoadingIds(prev => new Set([...prev, ...ids]))
    return ids
  }, [])

  // 2) Po konwersji podmień szkielety na preview (blob)
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
          })
        }
      }
      return Array.from(byId.values())
    })
    // ⭐️ ZMIANA 2: Usuwamy stąd `setLoadingIds`.
    // Flaga "loading" musi zostać aż do ZAKOŃCZENIA uploadu, a nie tylko konwersji.
  }, [])

  const rollbackTemps = (ids: string[]) => {
    if (!ids.length) return
    setList(curr => curr.filter(a => !ids.includes(String(a.id))))
    for (const id of ids) {
      const url = tempBlobUrls.current.get(id)
      if (url) {
        URL.revokeObjectURL(url)
        tempBlobUrls.current.delete(id)
      }
    }
    // Rollback musi też czyścić flagi ładowania
    setLoadingIds(prev => {
      const p = new Set(prev)
      ids.forEach(id => p.delete(id))
      return p
    })
  }

  const MAX_FILE = 25 * 1024 * 1024 // 25MB

  // GŁÓWNY flow uploadu
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setUploadErr(null)

      const allowed = files.filter(f => f.size <= MAX_FILE)
      if (allowed.length !== files.length) {
        setUploadErr(`Pominięto pliki większe niż ${formatBytes(MAX_FILE)} .`)
      }
      if (!allowed.length) return

      // Ustawia loadingIds
      const skeletonIds = optimisticSkeletons(allowed)

      let previewables: File[] = allowed
      try {
        previewables = await ensurePreviewableImages(allowed, IMG_DEFAULTS)
      } catch {
        /* zostaw allowed */
      }

      // Aktualizuje podgląd (ale NIE usuwa loadingIds)
      fillSkeletonsWithPreview(skeletonIds, previewables)

      try {
        // Czekamy na zakończenie wysyłania
        await onAddFiles?.(allowed)

        // ⭐️ ZMIANA 3: SUKCES! Pliki są na serwerze.
        // Dopiero TERAZ usuwamy flagi 'loading' z tych plików.
        // To uruchomi `useEffect` (Zmiana 1) i posprząta listę.
        setLoadingIds(prev => {
          const p = new Set(prev)
          skeletonIds.forEach(id => p.delete(id))
          return p
        })
      } catch (err) {
        // Błąd: Wycofaj pliki temp (to już czyści loadingIds)
        rollbackTemps(skeletonIds)
        const msg =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Błąd uploadu. Spróbuj ponownie.'
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
    async (file: UIAttachment) => {
      if (isLoadingId(file.id)) return
      if (String(file.id).startsWith('temp-')) {
        const url = tempBlobUrls.current.get(String(file.id))
        if (url) {
          URL.revokeObjectURL(url)
          tempBlobUrls.current.delete(String(file.id))
        }
        setList(curr => curr.filter(a => a.id !== file.id))
        return
      }
      try {
        await onDeleteAttachment?.(file)
      } catch {
        /* ignore */
      }
    },
    [onDeleteAttachment, loadingIds] // dodajemy loadingIds na wszelki wypadek
  )

  return (
    <>
       <div className='mt-6 bg-ds-light-blue rounded-md p-4'>
        <label className='text-[13px] opacity-70 mb-2 block'>Załączniki</label>
        {/* Upload area */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={openPicker}
          onKeyDown={onKeyUpload}
          role='button'
          tabIndex={0}
          className={`w-full rounded-md border border-dashed border-middle-blue/30 cursor-pointer transition-all 
               ${dragOver ? 'bg-middle-blue/10' : 'hover:bg-middle-blue/5'}
               px-4 py-3 grid place-items-center select-none caret-transparent`}
          title='Przeciągnij i upuść pliki lub kliknij, aby dodać'
          aria-label='Dołącz pliki'>
          <input
            ref={fileRef}
            type='file'
            multiple
            accept={[
              'image/*',
              'image/heic',
              'image/heif',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/csv',
              'text/plain',
              'application/zip',
              'application/x-zip-compressed',
            ].join(',')}
            className='hidden'
            onChange={onFilesSelected}
          />
          <span className='inline-flex items-center gap-2 text-[12px] md:text-[15px] text-middle-blue/50 py-4'>
            <Plus className='h-4 w-4' /> Dołącz pliki
          </span>
        </div>
        {uploadErr && <div className='mt-2 text-[12px] text-red'>{uploadErr}</div>}

        {/* Files list */}
        {list.length > 0 ? (
          <div className='mt-3 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2'>
            {list.map((f, i) => (
              <AttachmentThumbnail
                key={String(f.id) || i}
                file={f}
                loading={isLoadingId(f.id)}
                onPreview={setPreviewUrl}
                onConfirmDelete={setConfirmAttachment}
              />
            ))}
          </div>
        ) : (
          <label className='block mt-4 text-[13px] opacity-70'>Brak załączników.</label>
        )}
      </div>

      {/* Modale */}
      {previewUrl && <UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />}

      <UniversalConfirmModal
        open={!!confirmAttachment}
        title='Usunąć załącznik?'
        description='Tej operacji nie można cofnąć.'
        confirmText='Usuń'
        cancelText='Anuluj'
        tone='danger'
        onConfirm={async () => {
          const file = confirmAttachment
          setConfirmAttachment(null)
          if (file) await handleDelete(file)
        }}
        onCancel={() => setConfirmAttachment(null)}
      />
    </>
  )
}

// ====================================================================
//  KOMPONENT THUMBNAIL
// ====================================================================
const AttachmentThumbnail = ({
  file,
  loading,
  onPreview,
  onConfirmDelete,
}: {
  file: UIAttachment
  loading: boolean
  onPreview: (url: string) => void
  onConfirmDelete: (file: UIAttachment) => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(file.file_url || null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  const fname = file.file_name || 'File'
  const href = loadedUrl || ''

  useEffect(() => {
    if (href || !file.storage_path || String(file.id).startsWith('temp-')) {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoadingUrl(true)
          createSignedUrl(file.storage_path)
            .then(url => setLoadedUrl(url))
            .catch(e => console.error('Failed to get signed URL', e))
            .finally(() => setIsLoadingUrl(false))
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '50px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [file.id, file.storage_path, href])

  // Plik jest "w trakcie" jeśli ma flagę `loading` (bo się wysyła)
  // LUB jeśli ładuje swój signed URL (dla już wysłanych)
  const effectiveLoading = loading || (isLoadingUrl && !href)
  const isImg = isImage(file)

  return (
    <div
      ref={ref}
      className='group relative w-full aspect-square rounded-md border border-middle-blue/15 bg-white overflow-visible'
      title={fname}>
      {isImg && href ? (
        <button
          type='button'
          className='block relative h-full w-full text-left rounded-md overflow-hidden'
          onClick={() => !effectiveLoading && onPreview(href)}
          onMouseDown={e => e.preventDefault()}
          title='Kliknij, aby powiększyć'
          disabled={effectiveLoading}>
          <img
            src={href}
            alt={fname}
            className={`absolute inset-0 h-full w-full object-cover transition ${
              effectiveLoading ? 'opacity-70' : 'group-hover:brightness-60'
            }`}
          />
        </button>
      ) : (
        <div className='h-full w-full rounded-md overflow-hidden bg-middle-blue/8 grid place-items-center p-2'>
          {!isImg && (
            <span className='text-[10px] text-middle-blue/70 break-all text-center line-clamp-3'>{fname}</span>
          )}
        </div>
      )}

      {effectiveLoading && (
        <div className='absolute inset-0 bg-white/60 backdrop-blur-[1px] grid place-items-center'>
          <Loader2 className='h-5 w-5 animate-spin text-middle-blue' />
        </div>
      )}

      <button
        type='button'
        title={effectiveLoading ? 'Przetwarzanie…' : 'Usuń'}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          if (!effectiveLoading) onConfirmDelete(file)
        }}
        disabled={effectiveLoading}
        className={`absolute -top-2 -right-2 z-20 inline-flex h-6 w-6 items-center justify-center
          rounded-full text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/70
          transition-colors duration-200
          opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100
          pointer-events-auto md:pointer-events-none md:group-hover:pointer-events-auto md:focus:pointer-events-auto
          ${effectiveLoading ? 'bg-middle-blue/50 cursor-not-allowed' : 'bg-middle-blue hover:bg-red'}
        `}>
        <XIcon className='h-3.5 w-3.5' />
      </button>
    </div>
  )
}