// app/admin/components/sections/messages/fetchers/sendMessage.ts
'use client'

import { supabase } from '@/utils/supabase/client'

const BUCKET = 'chat-attachments'
const MAX_FILE_MB = 100
const SIGNED_URL_EXPIRES = 60 * 15 // 15 min

type Args = { chatId: string; text: string; files?: File[] }

/* -------- helpers -------- */
function niceBytes(b: number) {
	const u = ['B', 'KB', 'MB', 'GB']
	let i = 0,
		n = b
	while (n >= 1024 && i < u.length - 1) {
		n /= 1024
		i++
	}
	return `${n.toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

function humanizeSupabaseError(err: any) {
	try {
		console.error('[sendMessage] raw error:', err, JSON.stringify(err))
	} catch {
		console.error('[sendMessage] raw error (no JSON):', err)
	}
	const code = err?.code || err?.status || err?.name || ''
	const msg = String(err?.message || err?.error_description || '')
	const det = typeof err?.details === 'string' ? err.details : ''
	const hint = typeof err?.hint === 'string' ? err.hint : ''
	const m = `${code} ${msg} ${det} ${hint}`.toLowerCase()
	if (m.includes('permission denied') || m.includes('rls')) return 'Brak uprawnień (RLS) do INSERT w messages.'
	if (m.includes('violates foreign key') && m.includes('chat_id')) return 'Nie znaleziono czatu o podanym ID.'
	if (m.includes('null value') || m.includes('not null')) return 'Brak wymaganych pól przy zapisie wiadomości.'
	if (m.includes('column') && m.includes('does not exist')) return 'Kolumna w SQL nie istnieje.'
	if (m.includes('schema cache')) return 'Błąd cache schematu API – zresetuj API cache w Supabase.'
	if (m.includes('bucket') || m.includes('storage') || m.includes('not found')) return 'Problem ze Storage/bucketem.'
	return msg || 'Nieznany błąd backendu'
}

const EXT_MIME: Record<string, string> = {
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
function inferMime(name: string, fb = 'application/octet-stream') {
	const ext = (name.split('.').pop() || '').toLowerCase()
	return EXT_MIME[ext] || fb
}

/* ---- auth helpers: refresh + retry ---- */
const looksLikeAuthExpiry = (e: any) => {
	const s = (e?.message || e?.error || '').toString().toLowerCase()
	return (
		e?.status === 401 ||
		e?.status === 403 ||
		s.includes('jwt') ||
		s.includes('token') ||
		s.includes('expired') ||
		s.includes('invalid')
	)
}

async function refreshSessionIfNeeded() {
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (session) return session
		const r = await supabase.auth.refreshSession()
		return r.data?.session ?? null
	} catch {
		return null
	}
}

/** Przyjmij też Postgrest*Builder (PromiseLike) i owiń w Promise.resolve, żeby TS nie marudził. */
async function withAuthRetry<T>(fn: () => PromiseLike<T> | T): Promise<T> {
	try {
		return await Promise.resolve(fn())
	} catch (e: any) {
		if (!looksLikeAuthExpiry(e)) throw e
		await refreshSessionIfNeeded()
		return await Promise.resolve(fn())
	}
}

/* ---- storage signed url ---- */
async function signPath(path: string) {
	const res = (await withAuthRetry(() =>
		supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES)
	)) as any
	if (res.error) throw res.error
	return res.data?.signedUrl as string
}

/* ===== MAIN ===== */
export const sendMessage = async ({ chatId, text, files = [] }: Args) => {
	// upewnij się, że mamy usera (i ew. odśwież sesję)
	let {
		data: { session },
	} = await supabase.auth.getSession()
	if (!session?.user) {
		await refreshSessionIfNeeded()
		const after = await supabase.auth.getSession()
		session = after.data.session
	}
	if (!session?.user) throw new Error('Nie jesteś zalogowany.')

	const userId = session.user.id
	const trimmed = (text ?? '').trim()
	const hasText = trimmed.length > 0
	const hasFiles = files.length > 0
	if (!hasText && !hasFiles) return null

	const tooBig = files.filter(f => f.size > MAX_FILE_MB * 1024 * 1024)
	if (tooBig.length) {
		const lines = tooBig.map(f => `${f.name} (${niceBytes(f.size)}) > ${MAX_FILE_MB} MB`)
		throw new Error(`Pliki za duże:\n- ${lines.join('\n- ')}`)
	}

	const now = new Date().toISOString()
	const msgId = crypto.randomUUID()
	const message_type: 'text' | 'file' | 'mixed' = hasText && hasFiles ? 'mixed' : hasFiles ? 'file' : 'text'

	// 1) INSERT wiadomości (retry na wypadek wygaśnięcia sesji)
	const insMsg = (await withAuthRetry(() =>
		supabase.from('messages').insert({
			id: msgId,
			chat_id: chatId,
			sender_id: userId,
			sender_role: 'user', // admin/staff zapisujemy jako 'user'
			content: hasText ? trimmed : '',
			message_type,
			created_at: now,
			is_read_by_agent: true,
			read_by_agent_at: now,
			is_read_by_contact: false,
			read_by_contact_at: null,
		})
	)) as any
	if (insMsg.error) {
		const readable = humanizeSupabaseError(insMsg.error)
		throw Object.assign(insMsg.error, { readable })
	}

	// 2) Uploady do Storage + INSERT attachments (rollback i retry)
	type InsertedAtt = {
		id?: string
		message_id: string
		file_name: string
		mime_type: string
		file_size: number
		file_path: string
		created_at?: string
	}

	const uploadedPaths: string[] = []
	let insertedAtts: InsertedAtt[] = []

	try {
		for (const f of files) {
			const safeName = f.name.replace(/[^\w.\-]/g, '_') || 'file'
			const random = crypto.randomUUID()
			const path = `${chatId}/${msgId}-${random}-${safeName}`
			const mime = f.type || inferMime(safeName)

			const up = (await withAuthRetry(() =>
				supabase.storage.from(BUCKET).upload(path, f, {
					upsert: false,
					cacheControl: '3600',
					contentType: mime,
				})
			)) as any
			if (up.error) throw up.error

			uploadedPaths.push(path)
			insertedAtts.push({
				message_id: msgId,
				file_name: safeName,
				mime_type: mime,
				file_size: f.size,
				file_path: path,
			})
		}

		if (insertedAtts.length) {
			const ins = (await withAuthRetry(() =>
				supabase
					.from('message_attachments')
					.insert(insertedAtts)
					.select('id,message_id,file_name,mime_type,file_size,file_path,created_at')
			)) as any
			if (ins.error) throw ins.error
			insertedAtts = (ins.data ?? []) as InsertedAtt[]
		}
	} catch (e) {
		await Promise.allSettled(uploadedPaths.map(p => supabase.storage.from(BUCKET).remove([p])))
		try {
			await supabase.from('messages').delete().eq('id', msgId)
		} catch {}
		const readable = humanizeSupabaseError(e)
		throw Object.assign(e as any, { readable })
	}

	// 3) Podpisane URL-e (też z retry)
	const signed = await Promise.all(
		insertedAtts.map(async a => {
			let file_url = ''
			try {
				file_url = await signPath(a.file_path)
			} catch {}
			return {
				id: String(a.id || crypto.randomUUID()),
				message_id: msgId,
				file_name: a.file_name,
				file_type: a.mime_type,
				mime_type: a.mime_type,
				file_size: a.file_size,
				file_path: a.file_path,
				file_url,
				created_at: a.created_at ?? now,
			}
		})
	)

	// 4) Zwrot do UI
	return {
		id: msgId,
		chat_id: chatId,
		sender_type: 'user' as const,
		body: hasText ? trimmed : '',
		created_at: now,
		is_read_by_agent: true,
		read_by_agent_at: now,
		is_read_by_contact: false,
		read_by_contact_at: null,
		attachments: signed,
	}
}
