'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Paperclip, Trash2, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import { ensurePreviewableImages, isImage as isImageFile } from '@/utils/convertImages'

const LottiePlayer = dynamic(() => import('../Lottie/LottiePlayer'), { ssr: false })
import Attach from '../../../public/icons/attachPEF.json'

export type UniversalAttachmentInputProps = {
  label?: string
  files: File[]
  onAddFiles: (converted: File[]) => void | Promise<void>
  onUpload?: (convertedJustAdded: File[]) => Promise<void>
  onRemoveAt: (index: number) => void
  accept?: string
  multiple?: boolean
  className?: string
  minHeight?: number
  /** maksymalny rozmiar pojedynczego pliku w bajtach (domyślnie 25 MB) */
  maxFileSizeBytes?: number
}

// rozszerzone: iPhone HEIC/HEIF itd.
const DEFAULT_ACCEPT = [
  // obrazy
  'image/*', 'image/heic', 'image/heif',
  // dokumenty
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
  // archiwa
  'application/zip', 'application/x-zip-compressed',
].join(',')

const safeUUID = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2))

// Używamy helpera z utils dla File
const isImage = (f: File) => isImageFile(f)

/** Buduje objectURL tylko dla obrazów (reszta i tak otworzy się w nowej karcie) */
const buildPreviewUrls = (files: File[]) =>
  files.map(f => (isImage(f) ? URL.createObjectURL(f) : ''))

export default function UniversalAttachmentInput({
  label = 'Attachments',
  files,
  onAddFiles,
  onUpload,
  onRemoveAt,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  className = '',
  minHeight = 140,
  maxFileSizeBytes = 25 * 1024 * 1024, // 25 MB
}: UniversalAttachmentInputProps) {
  // input + DnD
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  // processing states
  const [isConverting, setIsConverting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const isBusy = isConverting || isUploading

  const openPicker = () => inputRef.current?.click()
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current += 1
    setIsDragging(true)
  }
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const onDragLeave = () => {
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setIsDragging(false)
  }

  /** Główna logika dodawania: obrazy → konwersja; reszta → pass-through */
  const handleNewFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setLastError(null)

    // 1) Filtr rozmiaru + de-dupe (po nazwa+rozmiar)
    const incoming = Array.from(list)
    const withoutTooBig = incoming.filter(f => {
      if (f.size <= maxFileSizeBytes) return true
      setLastError(prev => (prev ? prev + ' ' : '') + `${f.name} > ${Math.round(maxFileSizeBytes / (1024*1024))}MB`)
      return false
    })

    const existingKeySet = new Set(files.map(f => `${f.name}|${f.size}`))
    const unique = withoutTooBig.filter(f => !existingKeySet.has(`${f.name}|${f.size}`))
    if (!unique.length) return

    // 2) Podziel na obrazy i nie-obrazy
    const imageFiles = unique.filter(isImage)
    const otherFiles = unique.filter(f => !isImage(f))

    try {
      // 3) Konwersja obrazów → previewable
      setIsConverting(true)
      const convertedImages = imageFiles.length ? await ensurePreviewableImages(new DataTransferFileList(imageFiles)) : []
      // 4) Merge z innymi
      const finalToAdd: File[] = [...convertedImages, ...otherFiles]

      // 5) Przekaż do rodzica
      await onAddFiles(finalToAdd)

      // 6) Opcjonalny upload
      if (onUpload) {
        setIsUploading(true)
        await onUpload(finalToAdd)
      }
    } finally {
      setIsUploading(false)
      setIsConverting(false)
    }
  }

  // Polyfill: FileList z tablicy File (do zgodności z ensurePreviewableImages)
  class DataTransferFileList implements FileList {
    private arr: File[]
    constructor(arr: File[]) { this.arr = arr }
    get length() { return this.arr.length }
    item(index: number) { return this.arr[index] ?? null }
    [index: number]: File
    [Symbol.iterator]() { return this.arr[Symbol.iterator]() }
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    await handleNewFiles(e.dataTransfer.files)
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleNewFiles(e.target.files)
    e.target.value = '' // reset – żeby dało się dodać ten sam plik ponownie
  }

  // Preview URL-e tylko dla obrazów (reszta = pusty string)
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const u = buildPreviewUrls(files)
    setUrls(u)
    return () => u.forEach(u0 => u0 && URL.revokeObjectURL(u0))
  }, [files])

  // Modal
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const openPreview = (idx: number) => {
    const f = files[idx]
    if (f && isImage(f) && urls[idx]) setSelectedPhoto(urls[idx])
  }

  // min-height dla strefy
  const zoneStyle = useMemo<React.CSSProperties>(() => ({ minHeight: `${minHeight}px` }), [minHeight])

  return (
    <div className={clsx('w-full max-w-full overflow-x-hidden', className)}>
      {/* Label */}
      <label className='block mb-2 font-medium text-dark-blue'>
        <span className='inline-flex items-center gap-2'>
          <Paperclip className='h-4 w-4 text-middle-blue' />
          {label}
        </span>
      </label>

      {/* Strefa DnD / Click */}
      <div
        role='button'
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={onKey}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={zoneStyle}
        className={clsx(
          'relative flex flex-col justify-center items-center w-full min-w-0 rounded-md border border-dashed bg-white',
          'px-4 md:px-6 py-4 md:py-6',
          'text-[12px] md:text-[13px] text-middle-blue font-heebo_regular cursor-pointer transition-all duration-200',
          isDragging
            ? '!border-green border-dashed !bg-green/15'
            : 'border-middle-blue/40 hover:border-green hover:bg-green/15'
        )}
      >
        {/* ukryty input */}
        <input
          ref={inputRef}
          type='file'
          accept={accept}
          multiple={multiple}
          className='hidden'
          onChange={onPick}
        />

        {/* prompt */}
        {!isBusy && (
          <div className='flex items-center gap-2 select-none pointer-events-none'>
            <span className='text-dark-blue/50'>Attach files (optional) — Drag & Drop or Click</span>
            <div className='w-6 h-6'>
              <LottiePlayer animationData={Attach} interval={11000} />
            </div>
          </div>
        )}

        {/* Overlay: processing / uploading */}
        {isBusy && (
          <div className='absolute inset-0 rounded-md bg-white/70 backdrop-blur-[1px] grid place-items-center'>
            <div className='flex items-center gap-3 px-4 py-2 rounded-md bg-white/90 border border-middle-blue/15'>
              <Loader2 className='h-4 w-4 animate-spin text-middle-blue' />
              <span className='text-[13px] text-middle-blue'>
                {isConverting ? 'Processing images…' : isUploading ? 'Uploading…' : 'Working…'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Miniatury/kafelki PONIŻEJ przycisku – auto-fill, nie wychodzą poza ekran */}
      {files.length > 0 && (
        <div className='mt-2 w-full min-w-0'>
          <div className='grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3'>
            {files.map((file, i) => {
              const isImg = isImage(file)
              const ext = (file.name.split('.').pop() || 'FILE').toUpperCase()
              return (
                <div
                  key={`${file.name}-${i}-${safeUUID()}`}
                  className='group relative w-full rounded-md border border-middle-blue/15 bg-white overflow-visible'
                >
                  {/* wrapper z zaokrągleniem obrazka */}
                  <button
                    type='button'
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isImg) openPreview(i) }}
                    onMouseDown={(e) => e.preventDefault()}
                    className='block w-full text-left rounded-md overflow-hidden'
                    title={isImg ? 'Click to preview' : file.name}
                  >
                    <div className='aspect-square w-full'>
                      {isImg && urls[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urls[i]}
                          alt={file.name}
                          className='h-full w-full object-cover transition-all duration-150 group-hover:brightness-60'
                        />
                      ) : (
                        <div className='h-full w-full flex items-center justify-center'>
                          <span className='text-[11px] text-middle-blue/70 px-2 py-1 rounded bg-middle-blue/10'>
                            {ext}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* nazwa */}
                  <div className='px-2 py-1 text-[11px] text-middle-blue/80 truncate border-t border-middle-blue/10'>
                    {file.name}
                  </div>

                  {/* kosz – wyniesiony poza kafelek */}
                  <button
                    type='button'
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveAt(i) }}
                    title='Remove'
                    className='absolute -top-2 -right-2 z-10 inline-flex items-center justify-center
                               h-8 w-8 rounded-full bg-middle-blue text-white shadow-lg
                               transition-all duration-150 hover:bg-red focus:bg-middle-blue focus:outline-none focus:ring-2 focus:ring-white/70'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal podglądu (tylko obrazy) */}
      <UniversalImageModal selectedPhoto={selectedPhoto} onClose={() => setSelectedPhoto(null)} />

      {/* Info o błędzie (np. zbyt duże pliki) */}
      {lastError && (
        <div className='mt-2 text-[12px] text-red'>
          {lastError}
        </div>
      )}
    </div>
  )
}
