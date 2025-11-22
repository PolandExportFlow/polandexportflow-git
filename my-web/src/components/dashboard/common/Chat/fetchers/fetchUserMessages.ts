// import { supabase } from '@/utils/supabase/client'
// import type { Message, MessageAttachment } from '../userMsgTypes'

// export type FetchUserMessagesOpts = {
// 	limit?: number
// 	beforeTs?: string | null
// 	beforeId?: string | null
// }

// async function signFromPath(path?: string | null): Promise<string> {
// 	if (!path) return ''
// 	const { data, error } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 60 * 15)
// 	return error || !data?.signedUrl ? '' : data.signedUrl
// }

// /** Normalizacja dat do ISO/UTC */
// const toIso = (v: any) => new Date(String(v ?? '')).toISOString()

// export async function fetchUserMessages({
// 	limit = 12,
// 	beforeTs = null,
// 	beforeId = null,
// }: FetchUserMessagesOpts = {}): Promise<{
// 	rows: Message[]
// 	oldestTs: string | null
// 	oldestId: string | null
// 	hasMore: boolean
// 	chatId: string | null
// }> {
// 	// limit z domyślną 12 + bezpieczne widełki
// 	const pageSize = Math.max(1, Math.min(200, Number(limit) || 12))
// 	const fetchSize = pageSize + 1

// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	if (!session?.user) throw new Error('No session')

// 	const { data: chat, error: chatErr } = await supabase
// 		.from('chats')
// 		.select('id')
// 		.eq('user_id', session.user.id)
// 		.maybeSingle()
// 	if (chatErr) throw chatErr

// 	if (!chat) return { rows: [], oldestTs: null, oldestId: null, hasMore: false, chatId: null }

// 	let q = supabase
// 		.from('messages')
// 		.select(
// 			`
//       id, chat_id, sender_role, content, created_at,
//       is_read_by_contact, read_by_contact_at,
//       is_read_by_agent, read_by_agent_at,
//       attachments:message_attachments(
//         id, message_id, file_name, file_url, mime_type, file_size, file_path, created_at
//       )
//     `
// 		)
// 		.eq('chat_id', chat.id)
// 		.order('created_at', { ascending: false })
// 		.order('id', { ascending: false })
// 		.limit(fetchSize)

// 	// keyset pagination (DESC) – zmieniona kolejność warunków w OR
// 	if (beforeTs && beforeId) {
// 		q = q.or(`and(created_at.eq.${beforeTs},id.lt.${beforeId}),created_at.lt.${beforeTs}`)
// 	} else if (beforeTs) {
// 		q = q.lt('created_at', beforeTs)
// 	}

// 	const { data, error } = await q
// 	if (error) throw error

// 	const base = Array.isArray(data) ? data : []
// 	const hasMoreDesc = base.length > pageSize
// 	const sliceDesc = hasMoreDesc ? base.slice(0, pageSize) : base

// 	// podpisz URL-e z file_path, jeśli brak file_url
// 	for (const row of sliceDesc) {
// 		const atts = Array.isArray(row.attachments) ? row.attachments : []
// 		for (const a of atts) {
// 			if (!a?.file_url && a?.file_path) a.file_url = await signFromPath(a.file_path)
// 		}
// 	}

// 	const rowsDesc: Message[] = sliceDesc.map((r: any): Message => {
// 		const attRows = Array.isArray(r.attachments) ? (r.attachments as any[]) : []
// 		const attachments: MessageAttachment[] = attRows.map(a => ({
// 			id: String(a.id),
// 			message_id: String(a.message_id),
// 			file_name: String(a.file_name ?? ''),
// 			file_url: String(a.file_url ?? ''),
// 			mime_type: a.mime_type ?? undefined,
// 			file_size: Number(a.file_size ?? 0),
// 			file_path: a.file_path ?? undefined,
// 			created_at: a.created_at ? toIso(a.created_at) : undefined,
// 		}))

// 		const fromAgent = String(r.sender_role) === 'user' // 'user' = admin/support
// 		// z perspektywy kontaktu:
// 		const isReadForContact = fromAgent ? !!r.is_read_by_contact : true
// 		const readAtForContact = fromAgent
// 			? r.read_by_contact_at
// 				? toIso(r.read_by_contact_at)
// 				: undefined
// 			: toIso(r.created_at)

// 		return {
// 			id: String(r.id),
// 			chat_id: String(r.chat_id),
// 			sender_type: String(r.sender_role) as Message['sender_type'],
// 			body: String(r.content ?? ''),
// 			created_at: toIso(r.created_at),
// 			is_read: isReadForContact,
// 			read_at: readAtForContact,
// 			attachments,
// 		}
// 	})

// 	// do UI rosnąco
// 	const rows = rowsDesc.reverse()
// 	const oldestTsOut = rows[0]?.created_at ?? beforeTs ?? null
// 	const oldestIdOut = rows[0]?.id ?? beforeId ?? null
// 	const hasMore = hasMoreDesc

// 	return { rows, oldestTs: oldestTsOut, oldestId: oldestIdOut, hasMore, chatId: String(chat.id) }
// }
