// app/admin/components/sections/messages/fetchers/deleteMessage.ts
import { supabase } from '@/utils/supabase/client'

const BUCKET = 'chat-attachments'

export async function deleteMessage(messageId: string) {
	// 1) Zbierz ścieżki plików (do sprzątnięcia w Storage)
	const { data: atts, error: attErr } = await supabase
		.from('message_attachments')
		.select('file_path')
		.eq('message_id', messageId)

	if (attErr) throw attErr

	// 2) Usuń wiadomość (RLS: admin-only). Jeśli masz ON DELETE CASCADE to OK;
	//    jeśli nie masz, i tak sprzątamy attachments ręcznie poniżej.
	const { error: delMsgErr } = await supabase.from('messages').delete().eq('id', messageId)

	if (delMsgErr) throw delMsgErr

	// 3) Usuń ewentualne wiersze załączników (na wypadek braku CASCADE)
	await supabase.from('message_attachments').delete().eq('message_id', messageId)

	// 4) Usuń pliki ze storage (best-effort)
	const paths = (atts ?? []).map(a => a?.file_path).filter((p): p is string => !!p)

	if (paths.length) {
		const { error: storErr } = await supabase.storage.from(BUCKET).remove(paths)
		if (storErr) console.warn('Storage remove warn:', storErr)
	}

	return { ok: true }
}
