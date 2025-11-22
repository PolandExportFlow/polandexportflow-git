// // b2c/common/Chat/fetchers/createOrGetChat.ts
// import { supabase } from '@/utils/supabase/client'

// /** Zwraca istniejący chatId albo null – NIC nie tworzy. */
// export async function getExistingChatId(): Promise<{ chatId: string | null }> {
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	const uid = session?.user?.id
// 	if (!uid) throw new Error('No session')

// 	const { data, error } = await supabase.from('chats').select('id').eq('user_id', uid).maybeSingle()

// 	if (error && error.code !== 'PGRST116') throw error
// 	return { chatId: data?.id ?? null }
// }

// /** Tworzy chat tylko gdy go nie ma. Bez żadnych contact_* kolumn. */
// export async function ensureChatForFirstMessage(): Promise<{ chatId: string }> {
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	const uid = session?.user?.id
// 	if (!uid) throw new Error('No session')

// 	// 1) sprawdź czy jest
// 	{
// 		const { data, error } = await supabase.from('chats').select('id').eq('user_id', uid).maybeSingle()
// 		if (error && error.code !== 'PGRST116') throw error
// 		if (data?.id) return { chatId: String(data.id) }
// 	}

// 	// 2) spróbuj wstawić minimalny rekord
// 	{
// 		const { data, error } = await supabase.from('chats').insert({ user_id: uid }).select('id').single()

// 		if (!error && data?.id) return { chatId: String(data.id) }

// 		// 3) jeżeli konflikt/duplikat – odczytaj ponownie (warunki wyścigu)
// 		if (error && (error.code === '23505' || /duplicate key|conflict/i.test(String(error.message)))) {
// 			const { data: again, error: readErr } = await supabase.from('chats').select('id').eq('user_id', uid).maybeSingle()
// 			if (readErr) throw readErr
// 			if (again?.id) return { chatId: String(again.id) }
// 		}
// 		throw error ?? new Error('Failed to create chat')
// 	}
// }
