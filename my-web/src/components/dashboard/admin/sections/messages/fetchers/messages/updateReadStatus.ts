'use client'

import { supabase } from '@/utils/supabase/client'

/** Czy błąd wygląda na problem z auth/JWT. */
const isAuthError = (e: unknown) => {
	const msg = String((e as any)?.message || (e as any)?.error_description || (e as any)?.error || '').toLowerCase()
	return /jwt|token|auth|session/i.test(msg)
}

/** Upewnij się, że mamy świeżą sesję (odświeża jeśli <60s do wygaśnięcia). */
async function ensureFreshSession() {
	const {
		data: { session },
	} = await supabase.auth.getSession()
	const exp = (session as any)?.expires_at as number | undefined // epoch seconds
	const now = Math.floor(Date.now() / 1000)
	if (!session || (typeof exp === 'number' && exp - now < 60)) {
		try {
			await supabase.auth.refreshSession()
		} catch {
			/* ignore */
		}
	}
}

/** Woła RPC z automatycznym refresh sesji i jednym retry na auth error. */
async function callRpcWithRetry<T = unknown>(fn: string, args: Record<string, any>): Promise<T | null> {
	await ensureFreshSession()
	let { data, error } = await supabase.rpc(fn, args)
	if (error && isAuthError(error)) {
		try {
			await supabase.auth.refreshSession()
		} catch {
			/* ignore */
		}
		const retry = await supabase.rpc(fn, args)
		data = retry.data as any
		error = retry.error
	}
	if (error) throw error
	return (data as T) ?? null
}

export async function markRead(chatId: string): Promise<void> {
	if (!chatId) return
	await callRpcWithRetry('mark_chat_read', { p_chat_id: chatId })
}

export async function markUnread(chatId: string): Promise<void> {
	if (!chatId) return
	await callRpcWithRetry('mark_chat_unread', { p_chat_id: chatId })
}
