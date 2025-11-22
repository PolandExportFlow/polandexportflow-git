// src/components/dashboard/admin/sections/messages/fetchers/fetchChatProfileInfo.ts
import { supabase } from '@/utils/supabase/client'
import { ContactDetails } from '../../msgTypes'

export type ChatMeta = {
	is_new: boolean
	unread_count: number
	last_message_at: string | null
}

export type Profile = ContactDetails & {
	company_name?: string
	account_type?: 'b2b' | 'b2c'
	address_street?: string
	address_apartment?: string
	address_city?: string
	address_postal?: string
	address_country?: string

	default_street?: string
	default_apartment?: string
	default_city?: string
	default_postal?: string
	default_country?: string

	chat_meta?: ChatMeta
}

export async function fetchChatProfileInfo(chatId: string): Promise<Profile | null> {
	// 1) user_id z czatu
	const { data: chatRow, error: chatErr } = await supabase
		.from('chats')
		.select('user_id')
		.eq('id', chatId)
		.maybeSingle()
	if (chatErr) throw chatErr

	const userId = (chatRow as any)?.user_id as string | undefined
	if (!userId) return null

	// 2) meta czatu: najpierw chat_list, potem fallback z messages
	let unread_count = 0
	let last_message_at: string | null = null

	try {
		const { data: metaRow } = await supabase
			.from('chat_list') // <-- Twój widok
			.select('unread_count,last_message_at')
			.eq('id', chatId)
			.maybeSingle()

		if (metaRow) {
			unread_count = Number((metaRow as any)?.unread_count ?? 0)
			last_message_at = (metaRow as any)?.last_message_at ? String((metaRow as any).last_message_at) : null
		} else {
			throw new Error('no row in chat_list')
		}
	} catch {
		// Fallback bez widoku: policz z messages
		const { data: lastRow } = await supabase
			.from('messages')
			.select('created_at')
			.eq('chat_id', chatId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()
		last_message_at = lastRow?.created_at ? String(lastRow.created_at) : null

		const { count } = await supabase
			.from('messages')
			.select('id', { count: 'exact', head: true })
			.eq('chat_id', chatId)
			.neq('sender_role', 'user') // nie moje wiadomości
			.or('is_read.eq.false,read_at.is.null') // nieprzeczytane
		unread_count = Number(count ?? 0)
	}

	const chat_meta: ChatMeta = {
		is_new: unread_count > 0,
		unread_count,
		last_message_at,
	}

	// 3) profil użytkownika
	const { data: u, error: uErr } = await supabase
		.from('users')
		.select(
			`
      id, full_name, email, phone, account_type, company_name, admin_note,
      default_street, default_apartment, default_city, default_postal, default_country
    `
		)
		.eq('id', userId)
		.maybeSingle()
	if (uErr) throw uErr
	if (!u) return null

	const street = [u.default_street, u.default_apartment].filter(Boolean).join(' ')
	const cityLine = [u.default_postal, u.default_city].filter(Boolean).join(' ')
	const oneLine = [street, cityLine, u.default_country].filter(Boolean).join(', ')

	return {
		id: String(u.id),
		full_name: String(u.full_name || 'Contact'),
		email: u.email || undefined,
		phone: u.phone || undefined,
		address: oneLine || undefined,

		company_name: u.company_name || undefined,
		account_type: (u.account_type as any) || undefined,

		address_street: u.default_street || undefined,
		address_apartment: u.default_apartment || undefined,
		address_city: u.default_city || undefined,
		address_postal: u.default_postal || undefined,
		address_country: u.default_country || undefined,

		default_street: u.default_street || undefined,
		default_apartment: u.default_apartment || undefined,
		default_city: u.default_city || undefined,
		default_postal: u.default_postal || undefined,
		default_country: u.default_country || undefined,

		chat_meta,
	}
}
