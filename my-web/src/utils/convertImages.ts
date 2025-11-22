// @/utils/convertImages.ts
'use client'

// Definiujemy typ, żeby nie było błędu importu
export type ConvertOptions = {
    format?: 'image/webp' | 'image/jpeg' | 'image/png' 
    quality?: number
    maxEdge?: number
}

export const DEFAULTS: Required<ConvertOptions> = {
    format: 'image/webp',
    quality: 0.90,
    maxEdge: 3000,
}

export function isHeic(file: File): boolean {
    const mime = (file.type || '').toLowerCase()
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    return mime === 'image/heic' || mime === 'image/heif' || ext === 'heic' || ext === 'heif'
}

export function isImage(file: File): boolean {
    return (file.type || '').toLowerCase().startsWith('image/')
}

export async function convertHeicToJpeg(file: File, quality = DEFAULTS.quality): Promise<File> {
    const heic2any = (await import('heic2any')).default as any
    const blob = (await heic2any({ blob: file, toType: 'image/jpeg', quality })) as Blob
    const name = file.name.replace(/\.[^.]+$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}

export function makeObjectURLs(files: File[]): { urls: string[]; cleanup: () => void } {
    const urls = files.map(f => URL.createObjectURL(f))
    const cleanup = () => urls.forEach(u => URL.revokeObjectURL(u))
    return { urls, cleanup }
}

export function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
    const supportCreateImageBitmap = typeof (globalThis as any).createImageBitmap === 'function'
    if (supportCreateImageBitmap) {
        try {
            return await (globalThis as any).createImageBitmap(blob, { imageOrientation: 'from-image' })
        } catch {
            // fallback
        }
    }
    
    const url = URL.createObjectURL(blob)
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image()
            el.onload = () => resolve(el)
            el.onerror = reject
            el.src = url
        })
        return img
    } finally {
        URL.revokeObjectURL(url)
    }
}

function drawToCanvas(
    source: ImageBitmap | HTMLImageElement,
    maxEdge = DEFAULTS.maxEdge,
): HTMLCanvasElement {
    const sW = (source as any).width as number
    const sH = (source as any).height as number
    if (!sW || !sH) {
        const c = document.createElement('canvas')
        c.width = 1; c.height = 1
        return c
    }

    const scale = Math.min(1, maxEdge / Math.max(sW, sH))
    const dW = Math.round(sW * scale)
    const dH = Math.round(sH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = dW
    canvas.height = dH
    
    const ctx = canvas.getContext('2d') 
    if (!ctx) return canvas

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source as any, 0, 0, dW, dH)
    return canvas
}

async function reencodeCanvas(
    canvas: HTMLCanvasElement,
    { format = DEFAULTS.format, quality = DEFAULTS.quality }: ConvertOptions = {},
): Promise<Blob> {
    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
            format,
            (format === 'image/jpeg' || format === 'image/webp') ? quality : undefined,
        )
    })
}

export async function normalizeAndCompressImage(
    file: File,
    opts: ConvertOptions = DEFAULTS,
): Promise<File> {
    const blob = file
    const bitmap = await loadBitmap(blob)
    const canvas = drawToCanvas(bitmap, opts.maxEdge ?? DEFAULTS.maxEdge)
    const outBlob = await reencodeCanvas(canvas, opts)
    
    let ext = '.webp'
    if (opts.format === 'image/png') ext = '.png'
    if (opts.format === 'image/jpeg') ext = '.jpg'

    const name = file.name.replace(/\.[^.]+$/i, '') + ext
    
    return new File([outBlob], name, { type: opts.format ?? DEFAULTS.format, lastModified: Date.now() })
}

export async function ensurePreviewableImages(
    list: FileList | File[],
    opts: ConvertOptions = DEFAULTS,
): Promise<File[]> {
    const files = Array.from(list)
    const out: File[] = []

    for (const f of files) {
        try {
            if (isHeic(f)) {
                const jpeg = await convertHeicToJpeg(f, opts.quality ?? DEFAULTS.quality)
                out.push(await normalizeAndCompressImage(jpeg, opts))
            } else if (isImage(f)) {
                out.push(await normalizeAndCompressImage(f, opts))
            } else {
                out.push(f) 
            }
        } catch(err) {
            console.error(`Nie udało się skonwertować pliku: ${f.name}`, err)
            out.push(f)
        }
    }

    return out
}