// app/admin/components/sections/messages/fetchers/attachments/deleteAttachment.ts
'use client'

import { supabase } from '@/utils/supabase/client'

const BUCKET = 'chat-attachments'

type Args = { attachmentId: string; messageId: string }

/**
 * Usuwa pojedynczy załącznik:
 * 1) pobiera file_path (jeśli jest),
 * 2) usuwa plik ze Storage (best-effort),
 * 3) usuwa rekord w message_attachments,
 * 4) jeśli wiadomość nie ma już treści ani załączników — usuwa też wiadomość.
 */
export async function deleteAttachment({ attachmentId, messageId }: Args) {
	// 1) pobierz info o załączniku (może już nie istnieć)
	const { data: att, error: attErr } = await supabase
		.from('message_attachments')
		.select('id,file_path,message_id')
		.eq('id', attachmentId)
		.eq('message_id', messageId)
		.maybeSingle()

	if (attErr) {
		console.warn('[deleteAttachment] select attachment warn:', attErr)
	}

	// 2) usuń plik ze storage (ignorujemy błędy 404/permission)
	if (att?.file_path) {
		try {
			const { error: storErr } = await supabase.storage.from(BUCKET).remove([att.file_path])
			if (storErr) console.warn('[deleteAttachment] storage remove warn:', storErr)
		} catch (e) {
			console.warn('[deleteAttachment] storage remove catch:', e)
		}
	}

	// 3) usuń rekord załącznika
	const { error: delAttErr } = await supabase
		.from('message_attachments')
		.delete()
		.eq('id', attachmentId)
		.eq('message_id', messageId)

	if (delAttErr) {
		// RLS/permission — pozwól UI zrobić rollback
		throw delAttErr
	}

	// 4) sprawdź, czy wiadomość istnieje i czy ma jeszcze treść/załączniki
	const { data: msg, error: msgErr } = await supabase
		.from('messages')
		.select('id,content')
		.eq('id', messageId)
		.maybeSingle()

	if (msgErr) console.warn('[deleteAttachment] select message warn:', msgErr)

	// jeśli wiadomość już nie istnieje – nic dalej nie robimy
	if (!msg) return { messageDeleted: true }

	const { count: attCount, error: cntErr } = await supabase
		.from('message_attachments')
		.select('id', { count: 'exact', head: true })
		.eq('message_id', messageId)

	if (cntErr) console.warn('[deleteAttachment] count attachments warn:', cntErr)

	const noText = !msg.content || msg.content.trim().length === 0
	const noAtts = (attCount ?? 0) === 0

	let messageDeleted = false
	if (noText && noAtts) {
		const { error: delMsgErr } = await supabase.from('messages').delete().eq('id', messageId)

		if (delMsgErr) {
			console.warn('[deleteAttachment] delete message warn:', delMsgErr)
		} else {
			messageDeleted = true
		}
	}

	return { messageDeleted }
}
