// fetchChatProfileOrders.ts
import { supabase } from '@/utils/supabase/client'
import { ContactOrderSummary } from '../../msgTypes'

export async function fetchChatProfileOrders(chatId: string): Promise<ContactOrderSummary[]> {
	const { data: chat, error: chatErr } = await supabase.from('chats').select('user_id').eq('id', chatId).maybeSingle()
	if (chatErr) throw chatErr

	const userId = (chat as any)?.user_id as string | undefined
	if (!userId) return []

	const { data, error } = await supabase
		.from('orders')
		.select('id, order_number')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(20)

	if (error) throw error
	return (data ?? []) as ContactOrderSummary[]
}
