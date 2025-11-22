// messages/utils.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import { BUCKET, SIGNED_URL_EXPIRES } from '@/components/dashboard/common/Chat/shared'
import type { MessageAttachment } from '../msgTypes'

/** ISO normalizer (UTC) */
export const toIso = (v: any): string => {
	const s = String(v ?? '').trim()
	if (!s) return new Date(0).toISOString()
	const base = s.replace(' ', 'T')
	const hasTz = /(?:Z|[+\-]\d{2}(?::?\d{2})?)$/i.test(base)
	return hasTz ? base : `${base}Z`
}

/** Signed URL dla prywatnego bucketa */
export async function signPath(path?: string | null): Promise<string> {
	if (!path) return ''
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES)
	return error || !data?.signedUrl ? '' : data.signedUrl
}

/** Daty / formatki */
export const nowIso = () => new Date().toISOString()
export const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
export const dayLabel = (d: Date) =>
	d.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
export const formatTime = (ts: string) =>
	new Date(toIso(ts)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** Sortowanie po dacie z tie-breakerem po id */
export function byCreatedAsc(a: { created_at?: string; id: string }, b: { created_at?: string; id: string }) {
	const ta = +new Date(toIso(a.created_at))
	const tb = +new Date(toIso(b.created_at))
	if (ta !== tb) return ta - tb
	return String(a.id).localeCompare(String(b.id))
}

/** Linkify (proste) */
export const linkifyParts = (text: string): Array<{ t: 'text' | 'link'; v: string }> => {
	const urlRe = /((https?:\/\/|www\.)[^\s/$.?#].[^\s]*)/gi
	const parts: Array<{ t: 'text' | 'link'; v: string }> = []
	let last = 0
	let m: RegExpExecArray | null
	while ((m = urlRe.exec(text))) {
		const start = m.index
		const url = m[0]
		if (start > last) parts.push({ t: 'text', v: text.slice(last, start) })
		parts.push({ t: 'link', v: url.startsWith('http') ? url : `https://${url}` })
		last = start + url.length
	}
	if (last < text.length) parts.push({ t: 'text', v: text.slice(last) })
	return parts.length ? parts : [{ t: 'text', v: text }]
}

/** Pliki / obrazki */
const isImageLike = (s: string) => /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i.test(s || '')

export function isImg(v: string): boolean
export function isImg(v: MessageAttachment): boolean
export function isImg(v: { file_type?: string; file_name?: string; file_url?: string }): boolean
export function isImg(v: any): boolean {
	if (typeof v === 'string') return v.startsWith('image/') || isImageLike(v)
	const mt = v?.file_type || v?.mime_type || ''
	if (typeof mt === 'string' && mt.startsWith('image/')) return true
	const nameOrUrl = v?.file_name || v?.file_url || ''
	return isImageLike(String(nameOrUrl))
}

export const dlUrl = (url: string, name?: string) => {
	if (!url) return '#'
	const sep = url.includes('?') ? '&' : '?'
	return `${url}${sep}download=${encodeURIComponent(name || 'attachment')}`
}

/** Cache / listy */
export const capList = <T>(list: T[], cap = 300) => (list.length > cap ? list.slice(list.length - cap) : list)

export function dedupeById<T extends { id: string }>(list: T[]): T[] {
	const seen = new Set<string>()
	const out: T[] = []
	for (const m of list)
		if (!seen.has(m.id)) {
			seen.add(m.id)
			out.push(m)
		}
	return out
}

/** ===== READ flags – zgodnie z nowym schematem =====
 * mine = czy to MOJA (agenta) wiadomość?
 *  - jeśli tak: "read" = klient przeczytał → is_read_by_contact / read_by_contact_at
 *  - jeśli nie: "read" = agent przeczytał → is_read_by_agent / read_by_agent_at
 */
export function getIsRead(m: any, mine: boolean): boolean
export function getIsRead(m: any): boolean
export function getIsRead(m: any, mine?: boolean): boolean {
	if (typeof mine === 'boolean') {
		return mine
			? Boolean(m?.is_read_by_contact || m?.read_by_contact_at)
			: Boolean(m?.is_read_by_agent || m?.read_by_agent_at)
	}
	// Fallback dla starego wywołania bez 'mine'
	return (
		Boolean(m?.is_read) ||
		Boolean(m?.read_at) ||
		Boolean(m?.is_read_by_agent || m?.read_by_agent_at) ||
		Boolean(m?.is_read_by_contact || m?.read_by_contact_at)
	)
}

/** Ustaw "przeczytane przez agenta" (dla wiadomości klienta). */
export const withReadByAgent = <T extends object>(m: T): T =>
	({ ...(m as any), is_read_by_agent: true, read_by_agent_at: (m as any).read_by_agent_at ?? nowIso() } as T)

/** Zdejmij "przeczytane przez agenta" (cofnięcie). */
export const withoutReadByAgent = <T extends object>(m: T): T =>
	({ ...(m as any), is_read_by_agent: false, read_by_agent_at: null } as T)

/** Aliasy dla starego kodu – nie używać w nowym */
export const withReadFlag = withReadByAgent // DEPRECATED
export const withoutReadFlag = withoutReadByAgent // DEPRECATED
