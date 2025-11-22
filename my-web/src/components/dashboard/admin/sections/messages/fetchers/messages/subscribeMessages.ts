// messages/fetchers/messages/subscribeMessages.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import type { Message, MessageAttachment } from '../../msgTypes'
import { byCreatedAsc, signPath, toIso } from '../utils'

type SubscribeMessagesOpts = {
	chatId: string
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>
	onLastPreview?: (chatId: string, preview: string, atIso: string) => void
}

// --- helpers ---
const normalizeSender = (v?: string): 'user' | 'contact' => (v === 'contact' ? 'contact' : 'user')

const previewFromRow = (row: any): string => {
	const body = String(row?.content ?? row?.body ?? '').trim()
	if (body) return body
	const msgType = String(row?.message_type ?? '').toLowerCase()
	if (msgType && msgType !== 'text') return 'Attachment'
	// brak tekstu – jeśli wiemy, że są załączniki, też „Attachment”
	if (row?.attachments_count > 0 || row?.has_attachments) return 'Attachment'
	return ''
}

function rowToMessage(row: any): Message {
	const senderRole = row.sender_role ?? row.sender_type
	return {
		id: String(row.id),
		chat_id: String(row.chat_id),
		sender_id: row.sender_id ? String(row.sender_id) : undefined,
		sender_type: normalizeSender(String(senderRole)) as Message['sender_type'],
		body: String(row.content ?? row.body ?? ''),
		created_at: toIso(row.created_at),

		// nowe flagi "read"
		is_read_by_agent: row.is_read_by_agent ?? undefined,
		read_by_agent_at: row.read_by_agent_at ? toIso(row.read_by_agent_at) : undefined,
		is_read_by_contact: row.is_read_by_contact ?? undefined,
		read_by_contact_at: row.read_by_contact_at ? toIso(row.read_by_contact_at) : undefined,

		// legacy (opcjonalnie)
		is_read: row.is_read ?? undefined,
		read_at: row.read_at ? toIso(row.read_at) : undefined,

		attachments: [],
	} as unknown as Message
}

async function toAttachment(r: any): Promise<MessageAttachment> {
	const direct = r?.file_url ? String(r.file_url) : ''
	const fromPath = !direct && r?.file_path ? await signPath(String(r.file_path)) : ''
	return {
		id: String(r.id ?? crypto.randomUUID()),
		message_id: String(r.message_id),
		file_name: String(r.file_name ?? ''),
		file_url: direct || fromPath,
		mime_type: r.mime_type ?? undefined,
		file_type: r.mime_type ?? 'application/octet-stream',
		file_size: r.file_size ? Number(r.file_size) : undefined,
		file_path: r.file_path ?? undefined,
		created_at: r.created_at ? toIso(r.created_at) : undefined,
	}
}

export function subscribeMessages({ chatId, setMessages, onLastPreview }: SubscribeMessagesOpts): () => void {
	const channel = supabase.channel(`admin:chat:${chatId}:messages`)

	const upsertMessage = (row: any) => {
		const incoming = rowToMessage(row)
		setMessages(prev => {
			const idx = prev.findIndex(m => m.id === incoming.id)
			let next: Message[]
			if (idx === -1) {
				next = [...prev, incoming].sort(byCreatedAsc)
			} else {
				const keep = prev[idx] as any
				const merged: Message = {
					...(keep as any),
					...(incoming as any), // nadpisze body/created_at/sender*/read-flags
					attachments: keep.attachments, // zachowaj istniejące załączniki
				}
				next = [...prev]
				next[idx] = merged
				next = next.sort(byCreatedAsc)
			}
			return next
		})

		// Push do ChatList (preview + czas) – tylko gdy ma sens.
		if (onLastPreview) {
			const preview = previewFromRow(row)
			const atIso = toIso(row.created_at)
			// Wołamy gdy jest tekst lub wiemy o załącznikach (msgType != text)
			if (preview) onLastPreview(chatId, preview, atIso)
		}
	}

	// MESSAGES
	channel.on(
		'postgres_changes' as any,
		{ event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` } as any,
		(p: any) => upsertMessage(p.new)
	)
	channel.on(
		'postgres_changes' as any,
		{ event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` } as any,
		(p: any) => {
			const oldBody = String(p.old?.content ?? p.old?.body ?? '')
			const newBody = String(p.new?.content ?? p.new?.body ?? '')
			const oldTs = String(p.old?.created_at ?? '')
			const newTs = String(p.new?.created_at ?? '')
			upsertMessage(p.new)

			// Tylko jeśli istotnie zmienił się tekst lub timestamp — odśwież preview
			if (onLastPreview && (oldBody !== newBody || oldTs !== newTs)) {
				const preview = previewFromRow(p.new)
				const atIso = toIso(p.new.created_at)
				onLastPreview(chatId, preview, atIso)
			}
		}
	)
	channel.on(
		'postgres_changes' as any,
		{ event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` } as any,
		(p: any) => {
			const id = String(p.old.id)
			setMessages(prev => prev.filter(m => m.id !== id))
			// Uproszczenie: nie korygujemy last_preview po skasowaniu (to rzadkie case’y).
		}
	)

	// ATTACHMENTS
	channel.on(
		'postgres_changes' as any,
		{ event: 'INSERT', schema: 'public', table: 'message_attachments' } as any,
		async (p: any) => {
			const a = p.new
			if (!a?.message_id) return
			// pobierz minimalnie: chat_id, created_at, content (żeby ocenić preview)
			const { data: parent } = await supabase
				.from('messages')
				.select('chat_id, created_at, content, body')
				.eq('id', a.message_id)
				.maybeSingle()

			if (!parent || String(parent.chat_id) !== chatId) return

			const att = await toAttachment(a)
			setMessages(prev =>
				prev.map(m => {
					if (m.id !== att.message_id) return m
					const cur = (m.attachments ?? []) as MessageAttachment[]
					const exists = cur.some(x => x.id === att.id)
					const nxt = exists ? cur : [...cur, att]
					nxt.sort((x, y) => +new Date(x.created_at ?? 0) - +new Date(y.created_at ?? 0))
					return { ...(m as any), attachments: nxt } as Message
				})
			)

			// Jeśli wiadomość nie ma tekstu – ustaw ChatList preview na „Attachment”
			if (onLastPreview) {
				const hasText = String(parent.content ?? parent.body ?? '').trim().length > 0
				if (!hasText) onLastPreview(chatId, 'Attachment', toIso(parent.created_at))
			}
		}
	)

	channel.on(
		'postgres_changes' as any,
		{ event: 'UPDATE', schema: 'public', table: 'message_attachments' } as any,
		async (p: any) => {
			const a = p.new
			if (!a?.message_id) return
			const { data: parent } = await supabase
				.from('messages')
				.select('chat_id, created_at, content, body')
				.eq('id', a.message_id)
				.maybeSingle()
			if (!parent || String(parent.chat_id) !== chatId) return

			const att = await toAttachment(a)
			setMessages(prev =>
				prev.map(m =>
					m.id === att.message_id
						? ({ ...(m as any), attachments: (m.attachments ?? []).map(x => (x.id === att.id ? att : x)) } as Message)
						: m
				)
			)

			// Jeżeli brak tekstu – też upewnijmy się, że preview to „Attachment”
			if (onLastPreview) {
				const hasText = String(parent.content ?? parent.body ?? '').trim().length > 0
				if (!hasText) onLastPreview(chatId, 'Attachment', toIso(parent.created_at))
			}
		}
	)

	channel.on(
		'postgres_changes' as any,
		{ event: 'DELETE', schema: 'public', table: 'message_attachments' } as any,
		(p: any) => {
			const old = p.old
			if (!old?.id || !old?.message_id) return
			const msgId = String(old.message_id)
			const attId = String(old.id)
			setMessages(prev =>
				prev.map(m =>
					m.id === msgId
						? ({ ...(m as any), attachments: (m.attachments ?? []).filter(a => a.id !== attId) } as Message)
						: m
				)
			)
			// Previewu tu nie ruszamy — brak pełnego kontekstu, a i tak następny INSERT/UPDATE urealni stan.
		}
	)

	channel.subscribe(() => {})
	return () => {
		try {
			supabase.removeChannel(channel)
		} catch {}
	}
}
