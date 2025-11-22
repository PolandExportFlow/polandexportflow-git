// 'use client'

// import { supabase } from '@/utils/supabase/client'

// /**
//  * Oznacza wszystkie wiadomości AGENTA w danym czacie jako
//  * przeczytane przez kontakt (klienta).
//  * RPC w DB: mark_agent_msgs_read_by_contact(p_chat_id uuid)
//  */
// export async function markReadMessage(chatId: string): Promise<void> {
// 	if (!chatId) return
// 	try {
// 		await supabase.rpc('mark_agent_msgs_read_by_contact', { p_chat_id: chatId })
// 	} catch (e) {
// 		console.warn('[markReadMessage] RPC failed:', e)
// 	}
// }
