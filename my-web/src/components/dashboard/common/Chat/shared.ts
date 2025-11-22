// src/components/dashboard/common/Chat/shared.ts

export const BUCKET = 'chat-attachments'
export const MAX_FILE_MB = 100
export const SIGNED_URL_EXPIRES = 60 * 15 // 15 min
export const MAX_TEXT_CHARS = 4000

// ========= TIME (global, pod wiele krajów) =========
export function getBrowserTZ(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Akceptuje ISO z/bez strefy oraz "YYYY-MM-DD HH:mm:ss"
export function parseDbDate(s: string): Date {
  if (!s) return new Date()
  // Ma strefę (Z albo +hh:mm) → OK
  if (/(\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+\-]\d{2}:\d{2})$/.test(s)) return new Date(s)
  // "YYYY-MM-DDTHH:mm:ss" bez strefy → traktuj jako UTC
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s + 'Z')
  // "YYYY-MM-DD HH:mm:ss" → zamień na ISO i traktuj jako UTC
  return new Date(s.replace(' ', 'T') + 'Z')
}

export function formatTimeHM(iso: string, tz: string = getBrowserTZ(), locale = 'pl-PL'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(parseDbDate(iso))
}

export function formatDayLabel(isoOrDate: string | Date, tz: string = getBrowserTZ(), locale = 'pl-PL'): string {
  const d = typeof isoOrDate === 'string' ? parseDbDate(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }).format(d)
}

export function isSameDayTZ(a: string | Date, b: string | Date, tz: string = getBrowserTZ()): boolean {
  const da = typeof a === 'string' ? parseDbDate(a) : a
  const db = typeof b === 'string' ? parseDbDate(b) : b
  // yyyy-mm-dd porównane w tej samej strefie
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz,
  })
  return fmt.format(da) === fmt.format(db)
}

// ========= FILES / ATTACHMENTS =========
export function isImg(mimeOrName: string): boolean {
  return !!(mimeOrName?.startsWith?.('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(mimeOrName || ''))
}

export function dlUrl(url: string, name?: string): string {
  if (!url) return '#'
  const sep = url.includes('?') ? '&' : '?'
  const fname = encodeURIComponent(name || 'attachment')
  return `${url}${sep}download=${fname}`
}

export type LinkPart = { t: 'text' | 'link'; v: string }

export function linkifyParts(text: string): LinkPart[] {
  const urlRe = /((https?:\/\/|www\.)[^\s/$.?#].[^\s]*)/gi
  const parts: LinkPart[] = []
  let last = 0
  let m: RegExpExecArray | null
  // jawnie porównujemy z null, żeby TS się nie pluł
  while ((m = urlRe.exec(text)) !== null) {
    const start = m.index
    const url = m[0]
    if (start > last) parts.push({ t: 'text', v: text.slice(last, start) })
    parts.push({ t: 'link', v: url.startsWith('http') ? url : `https://${url}` })
    last = start + url.length
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) })
  return parts.length ? parts : [{ t: 'text', v: text }]
}

export function niceBytes(b: number): string {
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = b
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  const places = i === 0 ? 0 : 1
  return `${n.toFixed(places)} ${u[i]}`
}

export const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

export function inferMime(name: string, fallback = 'application/octet-stream'): string {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return EXT_MIME[ext] || fallback
}
