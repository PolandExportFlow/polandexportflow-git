import { supabase } from '@/utils/supabase/client'

/** Notatka admina z users.admin_note powiązana z czatem */
export async function fetchChatProfileNote(chatId: string): Promise<string | null> {
	const { data: chat, error: chatErr } = await supabase.from('chats').select('user_id').eq('id', chatId).maybeSingle()
	if (chatErr) throw chatErr
	const userId = (chat as any)?.user_id as string | undefined
	if (!userId) return null

	const { data, error } = await supabase.from('users').select('admin_note').eq('id', userId).maybeSingle()

	if (error) throw error
	return ((data as any)?.admin_note as string) ?? null
}
