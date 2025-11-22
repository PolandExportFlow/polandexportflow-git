// // b2c/common/Chat/fetchers/sendUserMessage.ts
// import { supabase } from '@/utils/supabase/client'
// import type { Message as CoreMessage } from '../userMsgTypes'

// const BUCKET = 'chat-attachments'
// const MAX_FILE_MB = 100

// type Args = { text: string; files?: File[] }

// export async function sendUserMessage({ text, files = [] }: Args): Promise<CoreMessage> {
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	const user = session?.user
// 	if (!user?.id) throw new Error('No session')

// 	const uid = user.id
// 	const body = (text ?? '').trim()
// 	if (!body && files.length === 0) throw new Error('EMPTY_MESSAGE')

// 	// === ensure chat ON SEND (bez contact_*) ===
// 	let chatId: string | null = null

// 	// 1) sprawdź czy jest
// 	{
// 		const { data, error } = await supabase.from('chats').select('id').eq('user_id', uid).maybeSingle()
// 		if (error && error.code !== 'PGRST116') throw error
// 		chatId = data?.id ? String(data.id) : null
// 	}

// 	// 2) jeśli nie ma – spróbuj wstawić minimalny rekord
// 	if (!chatId) {
// 		const { data, error } = await supabase.from('chats').insert({ user_id: uid }).select('id').single()

// 		if (!error && data?.id) {
// 			chatId = String(data.id)
// 		} else if (error) {
// 			// 3) wyścig / duplikat -> odczytaj ponownie
// 			if (error.code === '23505' || /duplicate key|conflict/i.test(String(error.message))) {
// 				const { data: again, error: readErr } = await supabase
// 					.from('chats')
// 					.select('id')
// 					.eq('user_id', uid)
// 					.maybeSingle()
// 				if (readErr) throw readErr
// 				if (!again?.id) throw new Error('Chat create race: could not read id')
// 				chatId = String(again.id)
// 			} else {
// 				throw error
// 			}
// 		}
// 	}

// 	if (!chatId) throw new Error('Chat not found/created')

// 	// === insert message ===
// 	const msgId = crypto.randomUUID()
// 	const createdAt = new Date().toISOString()

// 	const { data: msgRow, error: msgErr } = await supabase
// 		.from('messages')
// 		.insert({
// 			id: msgId,
// 			chat_id: chatId,
// 			sender_id: uid,
// 			sender_role: 'contact',
// 			content: body,
// 			created_at: createdAt,
// 			is_read_by_contact: true,
// 			read_by_contact_at: createdAt,
// 			is_read_by_agent: false,
// 			read_by_agent_at: null,
// 		})
// 		.select('id, chat_id, content, created_at')
// 		.single()
// 	if (msgErr) throw msgErr

// 	// === attachments (opcjonalnie) ===
// 	const atts: CoreMessage['attachments'] = []
// 	for (const file of files) {
// 		if (file.size > MAX_FILE_MB * 1024 * 1024) continue
// 		const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
// 		const path = `${msgId}/${safeName}`

// 		const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
// 		if (up.error) continue

// 		const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60)

// 		const { data: attRow, error: attErr } = await supabase
// 			.from('message_attachments')
// 			.insert({
// 				message_id: msgId,
// 				file_name: safeName,
// 				file_url: signed?.signedUrl ?? null, // UWAGA: podpisy wygasają (patrz notatka poniżej)
// 				file_path: path,
// 				mime_type: file.type || null,
// 				file_size: file.size || null,
// 			})
// 			.select('id, message_id, file_name, file_url, file_path, mime_type, file_size, created_at')
// 			.single()
// 		if (!attErr && attRow) {
// 			atts.push({
// 				id: String(attRow.id),
// 				message_id: String(attRow.message_id),
// 				file_name: String(attRow.file_name),
// 				file_url: attRow.file_url,
// 				file_path: String(attRow.file_path),
// 				mime_type: attRow.mime_type,
// 				file_size: Number(attRow.file_size ?? 0),
// 				created_at: attRow.created_at || undefined,
// 			})
// 		}
// 	}

// 	return {
// 		id: String(msgRow.id),
// 		chat_id: String(msgRow.chat_id),
// 		sender_type: 'contact',
// 		body: String(msgRow.content ?? ''),
// 		created_at: String(msgRow.created_at),
// 		is_read: true,
// 		read_at: createdAt,
// 		attachments: atts,
// 	}
// }
