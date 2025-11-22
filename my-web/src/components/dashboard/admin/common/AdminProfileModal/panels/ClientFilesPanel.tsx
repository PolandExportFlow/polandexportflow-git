// app/.../admin/common/AdminProfileModal/panels/ClientFilesPanel.tsx
'use client'

import React, { useCallback, useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import type { FileItem } from '../AdminProfileTypes'
import { createBrowserClient } from '@supabase/ssr'

const getSignedUrl = async (path: string) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.storage.from('orders').createSignedUrl(path, 3600)
    return error ? null : data?.signedUrl
}

const dateStr = (d?: string | Date) =>
    d
        ? new Date(d).toLocaleString('pl-PL', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—'

const getDisplayFileName = (fileName?: string) => {
    const name = fileName || 'Plik'
    const parts = name.split('.')
    const ext = parts.length > 1 ? parts.pop()?.toUpperCase() : ''
    
    return ext || name
}

function FileThumbnail({ file, onClick }: { file: FileItem; onClick: (file: FileItem, url: string | null) => void }) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const ref = useRef<HTMLDivElement | null>(null)

    const isImageFile = file.mime_type?.startsWith('image/') || false

    useEffect(() => {
        if (!isImageFile || signedUrl || isLoading) return
        
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsLoading(true)
                    getSignedUrl(file.storage_path)
                        .then(url => {
                            setSignedUrl(url)
                        })
                        .finally(() => {
                            setIsLoading(false)
                        })
                    observer.unobserve(entry.target)
                }
            },
            { rootMargin: '0px 0px 100px 0px' } 
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [file.storage_path, isImageFile, isLoading, signedUrl]) 

    return (
        <div
            ref={ref}
            onClick={() => onClick(file, signedUrl)}
            role='button'
            tabIndex={0}
            className='group relative overflow-hidden rounded-md border border-light-blue transition-colors duration-200 cursor-pointer bg-middle-blue/8'
            title={file.file_name || file.storage_path || 'file'}>
            
            <div className='aspect-[3/4] w-full overflow-hidden bg-gray-50 grid place-items-center'>
                {isLoading ? (
                    <Loader2 className='h-5 w-5 animate-spin text-middle-blue/60' />
                ) : signedUrl && isImageFile ? (
                    <img
                        src={signedUrl}
                        alt={file.file_name || 'file'}
                        className='h-full w-full object-cover' 
                        loading='lazy'
                    />
                ) : (
                    <div className='p-3 text-center'>
                        <ImageIcon className='h-5 w-5 text-middle-blue/20 mx-auto mb-1' />
                        <span className='text-[12px] text-middle-blue/70'>
                            {getDisplayFileName(file.file_name)}
                        </span>
                    </div>
                )}
            </div>
            
            <div className='px-2 py-1.5'>
                <div className='truncate text-[12px] text-middle-blue/90'>{file.file_name || '—'}</div>
                <div className='text-[10px] text-middle-blue/60 font-normal'>{dateStr(file.created_at)}</div>
            </div>

            <div className='absolute inset-0 bg-middle-blue/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none' />
        </div>
    )
}


type Props = {
    files: FileItem[]
    onLoadMore?: () => Promise<void>
    onFileOpen: (url: string) => void // NOWY PROP
}

export default function ClientFilesPanel({ files, onLoadMore, onFileOpen }: Props) {
    
    // ZMIENIONA LOGIKA: Zamiast window.open, wywołujemy onFileOpen
    const handleClick = useCallback((file: FileItem, signedUrl: string | null) => {
        const urlToOpen = signedUrl || '';
        
        if (urlToOpen && file.mime_type?.startsWith('image/')) {
            // Jeśli to obraz, otwieramy w modalu (przekazujemy URL do funkcji nadrzędnej)
            onFileOpen(urlToOpen);
        } else if (urlToOpen) {
            // Jeśli to inny plik (np. PDF), otwieramy w nowej karcie
            window.open(urlToOpen, '_blank', 'noopener,noreferrer');
        }
    }, [onFileOpen])

    return (
        <UniversalDetail title='Pliki' icon={<ImageIcon className='h-5 w-5' />} className='bg-white border-light-blue'>
            {files?.length ? (
                <>
                    <div className='max-h-[600px] overflow-y-auto pr-2 custom-scroll'>
                        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                            {files.map(f => (
                                <FileThumbnail
                                    key={f.id}
                                    file={f}
                                    onClick={handleClick}
                                />
                            ))}
                        </div>
                    </div>
                    {onLoadMore && (
                        <div className='pt-3'>
                            <button
                                type='button'
                                onClick={() => void onLoadMore()}
                                className='rounded-md border border-light-blue px-3 py-1.5 text-[13px] hover:bg-light-blue/20'>
                                Pokaż więcej
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className='text-[13px] opacity-70'>Brak plików od klienta.</div>
            )}
        </UniversalDetail>
    )
}