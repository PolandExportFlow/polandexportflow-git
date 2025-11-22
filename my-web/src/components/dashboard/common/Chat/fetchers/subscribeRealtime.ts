// // src/components/dashboard/common/Chat/fetchers/subscribeRealtime.ts
// 'use client'
// import { supabase } from '@/utils/supabase/client'
// import type { Message, MessageAttachment } from '../userMsgTypes'

// /* ===== Local auth helpers ===== */
// const toMsg = (e: any) => String(e?.message || e?.error || e || '')
// const isAuthError = (e: any) => /jwt|token|session|auth|expired|invalid/i.test(toMsg(e))

// async function ensureSession(minSecondsLeft = 90) {
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	const exp = (session as any)?.expires_at as number | undefined
// 	const now = Math.floor(Date.now() / 1000)
// 	if (!session || (typeof exp === 'number' && exp - now < minSecondsLeft)) {
// 		try {
// 			await supabase.auth.refreshSession()
// 		} catch {
// 			/* ignore */
// 		}
// 	}
// }

// async function withAuthRetry<T>(fn: () => Promise<T>, minSecondsLeft = 90): Promise<T> {
// 	await ensureSession(minSecondsLeft)
// 	try {
// 		return await fn()
// 	} catch (e) {
// 		if (isAuthError(e)) {
// 			try {
// 				await supabase.auth.refreshSession()
// 			} catch {
// 				/* ignore */
// 			}
// 			return await fn()
// 		}
// 		throw e
// 	}
// }

// /* ===== Storage signed URLs ===== */
// const BUCKET = 'chat-attachments'
// const SIGNED_EXPIRES = 60 * 15 // 15 min

// async function signedUrlOrEmpty(path: string): Promise<string> {
// 	if (!path) return ''
// 	const { data, error } = await withAuthRetry(() => supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_EXPIRES))
// 	return error || !data?.signedUrl ? '' : data.signedUrl
// }

// /* ===== Mappers ===== */
// function toMessage(r: any): Message {
// 	const fromAgent = String(r.sender_role) === 'user'
// 	const isReadForContact = fromAgent ? !!r.is_read_by_contact : true
// 	const readAtForContact = fromAgent
// 		? r.read_by_contact_at
// 			? String(r.read_by_contact_at)
// 			: undefined
// 		: String(r.created_at)

// 	return {
// 		id: String(r.id),
// 		chat_id: String(r.chat_id),
// 		sender_type: String(r.sender_role) as Message['sender_type'],
// 		body: String(r.content ?? ''),
// 		created_at: String(r.created_at),
// 		is_read: isReadForContact,
// 		read_at: readAtForContact,
// 		attachments: [],
// 	}
// }

// async function toAttachment(a: any): Promise<MessageAttachment> {
// 	const direct = a?.file_url ? String(a.file_url) : ''
// 	const fromPath = a?.file_path ? await signedUrlOrEmpty(String(a.file_path)) : ''
// 	const url: string = direct || fromPath

// 	return {
// 		id: String(a.id),
// 		message_id: String(a.message_id),
// 		file_name: String(a.file_name ?? ''),
// 		file_url: url,
// 		mime_type: a.mime_type ?? undefined,
// 		file_size: a.file_size ? Number(a.file_size) : 0,
// 		file_path: a.file_path ? String(a.file_path) : undefined,
// 		created_at: a.created_at ? String(a.created_at) : undefined,
// 	}
// }

// /* ===== Realtime subscribe ===== */
// export function subscribeRealtime(
// 	chatId: string,
// 	onInsert: (row: Message) => void,
// 	onAttachment?: (messageId: string, att: MessageAttachment) => void
// ) {
// 	// upewnij się, że token jest świeży zanim odpalimy kanał
// 	ensureSession().catch(() => {})

// 	const channel = supabase.channel(`chat:${chatId}`, { config: { broadcast: { ack: true } } })

// 	// 1) Wiadomości — bez filtra (filtrowanie w kodzie po chat_id)
// 	channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
// 		const r = payload?.new
// 		if (!r || String(r.chat_id) !== String(chatId)) return
// 		onInsert(toMessage(r))
// 	})

// 	// 2) Załączniki — też bez filtra; sprawdzamy parent.message.chat_id ręcznie
// 	channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_attachments' }, async payload => {
// 		if (!onAttachment) return
// 		const a = payload?.new
// 		if (!a?.message_id) return

// 		const parent = await withAuthRetry(async () => {
// 			const { data, error } = await supabase.from('messages').select('id, chat_id').eq('id', a.message_id).maybeSingle()
// 			if (error) throw error
// 			return data
// 		})

// 		if (!parent || String(parent.chat_id) !== String(chatId)) return

// 		const att = await toAttachment(a)
// 		onAttachment(att.message_id, att)
// 	})

// 	channel.subscribe(() => {})
// 	return () => {
// 		supabase.removeChannel(channel)
// 	}
// }
