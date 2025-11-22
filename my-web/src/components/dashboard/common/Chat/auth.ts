// 'use client'
// import { supabase } from '@/utils/supabase/supabase'

// const toMsg = (e: unknown) => String((e as any)?.message || (e as any)?.error || e || '')
// const isAuthError = (e: unknown) => /jwt|token|session|auth|expired|invalid/i.test(toMsg(e))

// /** Upewnij się, że sesja istnieje i nie wygaśnie za chwilę. */
// export async function ensureSession(minSecondsLeft = 90) {
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	const exp = (session as any)?.expires_at as number | undefined
// 	const now = Math.floor(Date.now() / 1000)
// 	if (!session || (typeof exp === 'number' && exp - now < minSecondsLeft)) {
// 		try {
// 			await supabase.auth.refreshSession()
// 		} catch {}
// 	}
// }

// /** Owiń call: ensure + retry, gdy auth poleci (expired/invalid JWT). */
// export async function withAuthRetry<T>(fn: () => Promise<T>, minSecondsLeft = 90): Promise<T> {
// 	await ensureSession(minSecondsLeft)
// 	try {
// 		return await fn()
// 	} catch (e) {
// 		if (isAuthError(e)) {
// 			try {
// 				await supabase.auth.refreshSession()
// 			} catch {}
// 			return await fn()
// 		}
// 		throw e
// 	}
// }

// /** Keep-alive: co X sekund sprawdź/odśwież token. Zwraca funkcję stop(). */
// export function startAuthKeepAlive(intervalMs = 45_000, minSecondsLeft = 90) {
// 	const t = setInterval(() => {
// 		ensureSession(minSecondsLeft).catch(() => {})
// 	}, intervalMs)
// 	return () => clearInterval(t)
// }
