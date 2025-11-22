// messages/fetchers/messages/fetchChatMessages.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import type { Message, MessageAttachment } from '../../msgTypes'
import { signPath, toIso } from '../utils'

export type FetchMessagesOpts = {
	limit?: number
	beforeTs?: string | null
	beforeId?: string | null
}

type ChatCache = { list: Message[]; oldestTs: string | null; oldestId: string | null; hasMore: boolean }
const chatCache = new Map<string, ChatCache>()
export function getChatCache(chatId: string) {
	return chatCache.get(chatId) ?? null
}
export function setChatCache(chatId: string, payload: ChatCache) {
	chatCache.set(chatId, payload)
}
export function dropChatCache(chatId?: string) {
	if (chatId) chatCache.delete(chatId)
	else chatCache.clear()
}

function mapDbRowToMessage(r: any, atts: MessageAttachment[]): Message {
	return {
		id: String(r.id),
		chat_id: String(r.chat_id),
		sender_id: r.sender_id ? String(r.sender_id) : undefined,
		sender_type: String(r.sender_role ?? r.sender_type) as Message['sender_type'],
		body: String(r.content ?? r.body ?? ''),
		created_at: toIso(r.created_at),

		// nowe flagi read – tylko jeśli istnieją w wierszu
		is_read_by_agent: r.is_read_by_agent ?? undefined,
		read_by_agent_at: r.read_by_agent_at ? toIso(r.read_by_agent_at) : undefined,
		is_read_by_contact: r.is_read_by_contact ?? undefined,
		read_by_contact_at: r.read_by_contact_at ? toIso(r.read_by_contact_at) : undefined,

		// legacy (jeśli jeszcze używane gdzieś w UI)
		is_read: r.is_read ?? undefined,
		read_at: r.read_at ? toIso(r.read_at) : undefined,

		attachments: atts,
	} as Message
}

export async function fetchChatMessages(
	chatId: string,
	{ limit = 12, beforeTs = null, beforeId = null }: FetchMessagesOpts = {}
): Promise<{ rows: Message[]; oldestTs: string | null; oldestId: string | null; hasMore: boolean }> {
	const pageSize = Math.max(1, Math.min(200, Number(limit) || 12))
	const fetchSize = pageSize + 1

	// UWAGA: gwiazdka + alias attachments – unika błędów, gdy nie ma części kolumn
	let q = supabase
		.from('messages')
		.select('*, attachments:message_attachments(*)')
		.eq('chat_id', chatId)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(fetchSize)

	// keyset pagination (DESC)
	if (beforeTs && beforeId) {
		q = q.or(`created_at.lt.${beforeTs},and(created_at.eq.${beforeTs},id.lt.${beforeId})`)
	} else if (beforeTs) {
		q = q.lt('created_at', beforeTs)
	}

	const { data, error } = await q
	if (error) throw error

	const base = Array.isArray(data) ? data : []
	const hasMoreDesc = base.length > pageSize
	const sliceDesc = hasMoreDesc ? base.slice(0, pageSize) : base

	// podpisujemy file_path jeśli brak bezpośredniego URL-a
	for (const row of sliceDesc) {
		if (Array.isArray(row.attachments)) {
			for (const a of row.attachments) {
				if (!a?.file_url && a?.file_path) a.file_url = await signPath(a.file_path)
			}
		}
	}

	const rowsDesc: Message[] = sliceDesc.map((r: any) => {
		const atts: MessageAttachment[] = Array.isArray(r.attachments)
			? (r.attachments as any[]).map(
					(a: any): MessageAttachment => ({
						id: String(a.id),
						message_id: String(a.message_id),
						file_name: String(a.file_name ?? ''),
						file_url: String(a.file_url ?? ''),
						mime_type: a.mime_type ?? undefined,
						file_type: a.mime_type ?? 'application/octet-stream',
						file_size: Number(a.file_size ?? 0),
						file_path: a.file_path ?? undefined,
						created_at: a.created_at ? toIso(a.created_at) : undefined,
					})
			  )
			: []
		return mapDbRowToMessage(r, atts)
	})

	// do UI chcemy rosnąco
	const rows = rowsDesc.reverse()
	const oldestTsOut = rows[0]?.created_at ?? beforeTs ?? null
	const oldestIdOut = rows[0]?.id ?? beforeId ?? null

	return { rows, oldestTs: oldestTsOut, oldestId: oldestIdOut, hasMore: hasMoreDesc }
}
