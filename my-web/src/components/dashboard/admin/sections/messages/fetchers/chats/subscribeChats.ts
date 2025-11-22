// app/admin/components/sections/messages/fetchers/chats/subscribeChats.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import type { ConversationSummary } from '../../msgTypes'
import { toIso } from '../utils'

// Ujednolicenie previewu jak w ChatList/useChats
function computePreview(row: any): string {
	const text = String(row.last_message ?? row.last_message_snippet ?? '').trim()
	if (text) return text
	const hasAtt =
		(Array.isArray(row.last_message_attachments) && row.last_message_attachments.length > 0) ||
		Boolean(row.last_message_has_attachments)
	return hasAtt ? '[photo]' : ''
}

// Zmapuj wiersz z widoku na kształt ConversationSummary z DWOMA polami last_message*
function toSummary(row: any): ConversationSummary {
	const preview = computePreview(row)
	return {
		id: String(row.id),
		contact_name: String(row.contact_name ?? 'Kontakt'),
		contact_email: row.contact_email ?? undefined,
		contact_phone: row.contact_phone ?? undefined,
		customer_type: row.customer_type === 'b2b' || row.customer_type === 'b2c' ? row.customer_type : undefined,

		// KLUCZOWE: ustawiamy oba pola na tę samą wartość
		last_message: preview,
		last_message_snippet: preview,

		// normalizacja do ISO (żeby sort/equals działał identycznie jak w useChats/ChatList)
		last_message_at: toIso(row.last_message_at ?? row.last_message_created_at ?? row.created_at ?? 0),

		unread_count: Number.isFinite(row?.unread_count) ? Number(row.unread_count) : 0,

		last_message_attachments: Array.isArray(row.last_message_attachments)
			? row.last_message_attachments.map((a: any) => ({
					file_url: String(a?.file_url ?? a?.url ?? ''),
					file_name: a?.file_name ? String(a.file_name) : a?.name ? String(a.name) : '',
			  }))
			: [],

		priority: row.priority === 'high' || row.priority === 'urgent' ? row.priority : 'normal',
		is_new: Boolean(row.is_new),
		owner_id: row.owner_id ?? null,
	}
}

/**
 * Realtime dla listy czatów – bez optymistycznych zmian.
 * Po każdym evencie refetch jednego rekordu z widoku `chat_list`
 * (raz szybko i raz „pewnie” po ~700 ms).
 */
export async function subscribeChats(
	setChats: React.Dispatch<React.SetStateAction<ConversationSummary[]>>
): Promise<() => void> {
	const channel: any = supabase.channel('admin:chats')

	// debounce + lock per chat
	const timers = new Map<string, ReturnType<typeof setTimeout>>()
	const locks = new Set<string>()

	const refetchOnce = (chatId: string, delayMs: number) => {
		const key = `${chatId}:${delayMs}`
		const prev = timers.get(key)
		if (prev) clearTimeout(prev)

		const t = setTimeout(async () => {
			if (locks.has(key)) return
			locks.add(key)
			try {
				const { data, error } = await supabase
					.from('chat_list')
					.select(
						`
            id,
            contact_name,
            contact_email,
            contact_phone,
            customer_type,
            last_message,             -- jeśli widok ma; OK gdy nie ma
            last_message_snippet,
            last_message_at,
            unread_count,
            last_message_attachments,
            is_new,
            owner_id,
            priority
          `
					)
					.eq('id', chatId)
					.maybeSingle()

				if (error || !data) return
				const mapped = toSummary(data)

				// Uwaga: useChats owija ten updater sortowaniem + shallowEqual
				setChats(prev => {
					const idx = prev.findIndex(c => c.id === chatId)
					if (idx === -1) return [mapped, ...prev]
					const next = [...prev]
					next[idx] = { ...next[idx], ...mapped } // nadpisujemy last_message*, at, unread, itp.
					return next
				})
			} finally {
				locks.delete(key)
			}
		}, delayMs)

		timers.set(key, t)
	}

	const refetchFromView = (chatId: string) => {
		refetchOnce(chatId, 150) // szybko
		refetchOnce(chatId, 700) // „pewnie” (gdy widok chwilę się przelicza)
	}

	const handleMsgRow = (row: any) => {
		const chatId = String(row?.chat_id ?? row?.new?.chat_id ?? row?.old?.chat_id ?? '') || ''
		if (!chatId) return
		refetchFromView(chatId)
	}

	// messages
	channel.on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' } as any, (pl: any) =>
		handleMsgRow(pl.new)
	)
	channel.on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'messages' } as any, (pl: any) =>
		handleMsgRow(pl.new)
	)
	channel.on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'messages' } as any, (pl: any) =>
		handleMsgRow(pl.old)
	)

	// attachments -> znajdź chat_id parenta i refetch
	channel.on(
		'postgres_changes' as any,
		{ event: 'INSERT', schema: 'public', table: 'message_attachments' } as any,
		async (pl: any) => {
			const a = pl?.new
			if (!a?.message_id) return
			const { data } = await supabase.from('messages').select('chat_id').eq('id', a.message_id).maybeSingle()
			if (!data?.chat_id) return
			refetchFromView(String(data.chat_id))
		}
	)
	channel.on(
		'postgres_changes' as any,
		{ event: 'UPDATE', schema: 'public', table: 'message_attachments' } as any,
		async (pl: any) => {
			const a = pl?.new
			if (!a?.message_id) return
			const { data } = await supabase.from('messages').select('chat_id').eq('id', a.message_id).maybeSingle()
			if (!data?.chat_id) return
			refetchFromView(String(data.chat_id))
		}
	)
	channel.on(
		'postgres_changes' as any,
		{ event: 'DELETE', schema: 'public', table: 'message_attachments' } as any,
		async (pl: any) => {
			const a = pl?.old
			if (!a?.message_id) return
			const { data } = await supabase.from('messages').select('chat_id').eq('id', a.message_id).maybeSingle()
			if (!data?.chat_id) return
			refetchFromView(String(data.chat_id))
		}
	)

	channel.subscribe(() => {})

	return () => {
		try {
			supabase.removeChannel(channel)
		} catch {}
		timers.forEach(t => clearTimeout(t))
		timers.clear()
		locks.clear()
	}
}
