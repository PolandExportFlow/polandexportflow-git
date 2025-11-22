// // common/Chat/hooks/useUserChat.ts
// 'use client'

// import { useCallback, useEffect, useRef, useState } from 'react'
// import type { Message } from '../userMsgTypes'
// import { supabase } from '@/utils/supabase/supabase'
// import { fetchUserMessages } from '../fetchers/fetchUserMessages'
// import { sendUserMessage } from '../fetchers/sendUserMessage'
// import { getExistingChatId } from '../fetchers/createOrGetChat' // ⬅️ zamiast createOrGetChat
// import { subscribeRealtime } from '../fetchers/subscribeRealtime'
// import { MAX_TEXT_CHARS } from '../shared'

// /* ===== Local auth helpers (tylko tutaj) ===== */
// const toMsg = (e: any) => String(e?.message || e?.error || e || '')
// const isAuthError = (e: any) => /jwt|token|session|auth|expired|invalid/i.test(toMsg(e))

// async function ensureSession(minSecondsLeft = 90) {
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession()
// 	const exp = (session as any)?.expires_at as number | undefined
// 	const now = Math.floor(Date.now() / 1000)
// 	if (!session || (typeof exp === 'number' && exp - now < minSecondsLeft)) {
// 		try {
// 			await supabase.auth.refreshSession()
// 		} catch {
// 			/* ignore */
// 		}
// 	}
// }

// async function withAuthRetry<T>(fn: () => Promise<T>, minSecondsLeft = 90): Promise<T> {
// 	await ensureSession(minSecondsLeft)
// 	try {
// 		return await fn()
// 	} catch (e) {
// 		if (isAuthError(e)) {
// 			try {
// 				await supabase.auth.refreshSession()
// 			} catch {
// 				/* ignore */
// 			}
// 			return await fn()
// 		}
// 		throw e
// 	}
// }

// function startAuthKeepAlive(intervalMs = 45_000, minSecondsLeft = 90) {
// 	const t = setInterval(() => {
// 		ensureSession(minSecondsLeft).catch(() => {})
// 	}, intervalMs)
// 	return () => clearInterval(t)
// }

// /* ===== Hook ===== */
// const CACHE_CAP = 300
// const INITIAL_LIMIT = 12
// const PAGE_LIMIT = 12
// const capList = (list: Message[]) => (list.length > CACHE_CAP ? list.slice(list.length - CACHE_CAP) : list)

// export function useUserChat() {
// 	const [chatId, setChatId] = useState<string | null>(null)
// 	const [messages, setMessages] = useState<Message[]>([])
// 	const [loading, setLoading] = useState(true)
// 	const [sending, setSending] = useState(false)
// 	const [hasMore, setHasMore] = useState(true)
// 	const [loadingMore, setLoadingMore] = useState(false)

// 	const oldestTsRef = useRef<string | null>(null)
// 	const oldestIdRef = useRef<string | null>(null)
// 	const unsubRef = useRef<null | (() => void)>(null)

// 	// keep-alive sesji
// 	useEffect(() => {
// 		const stop = startAuthKeepAlive(45_000, 90)
// 		return stop
// 	}, [])

// 	// anti-spam dla RPC
// 	const lastMarkRef = useRef(0)
// 	const canMarkNow = () => Date.now() - lastMarkRef.current > 1200

// 	/** Oznacz wiadomości AGENTA jako przeczytane przez kontakt. */
// 	const markAgentRead = useCallback(async () => {
// 		if (!chatId) return
// 		if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
// 		if (!canMarkNow()) return
// 		lastMarkRef.current = Date.now()
// 		try {
// 			await withAuthRetry(async () => {
// 				const { error } = await supabase.rpc('mark_agent_msgs_read_by_contact', { p_chat_id: chatId })
// 				if (error) throw error
// 				return null
// 			})
// 		} catch (e) {
// 			console.warn('[useUserChat] markAgentRead failed', e)
// 		}
// 	}, [chatId])

// 	// ---- init: sprawdź, czy chat już istnieje; NIE twórz tutaj
// 	useEffect(() => {
// 		let alive = true
// 		;(async () => {
// 			try {
// 				const { chatId: existing } = await withAuthRetry(() => getExistingChatId())
// 				if (!alive) return
// 				if (existing) {
// 					setChatId(existing)
// 					const res = await withAuthRetry(() => fetchUserMessages({ limit: INITIAL_LIMIT }))
// 					if (!alive) return
// 					oldestTsRef.current = res.oldestTs
// 					oldestIdRef.current = res.oldestId
// 					setHasMore(res.hasMore)
// 					setMessages(res.rows as Message[])
// 					await markAgentRead()
// 				} else {
// 					// brak czatu – UI gotowe, pierwsza wysyłka sama go utworzy
// 					setHasMore(false)
// 					setMessages([])
// 				}
// 			} finally {
// 				if (alive) setLoading(false)
// 			}
// 		})()
// 		return () => {
// 			alive = false
// 		}
// 	}, [markAgentRead])

// 	// ---- realtime sub (dopiero gdy znamy chatId)
// 	useEffect(() => {
// 		if (!chatId) return
// 		if (unsubRef.current) {
// 			unsubRef.current()
// 			unsubRef.current = null
// 		}

// 		ensureSession().catch(() => {})

// 		unsubRef.current = subscribeRealtime(chatId, async row => {
// 			setMessages(prev => capList([...prev, row]))
// 			if ((row as any)?.sender_type === 'user') {
// 				await markAgentRead()
// 			}
// 		})

// 		const onFocus = () => {
// 			markAgentRead()
// 		}
// 		const onVisibility = () => {
// 			if (document.visibilityState === 'visible') markAgentRead()
// 		}
// 		window.addEventListener('focus', onFocus)
// 		document.addEventListener('visibilitychange', onVisibility)

// 		return () => {
// 			if (unsubRef.current) unsubRef.current()
// 			window.removeEventListener('focus', onFocus)
// 			document.removeEventListener('visibilitychange', onVisibility)
// 		}
// 	}, [chatId, markAgentRead])

// 	// ---- paginacja
// 	const loadOlder = useCallback(async () => {
// 		if (!hasMore || loadingMore) return
// 		setLoadingMore(true)
// 		try {
// 			const res = await withAuthRetry(() =>
// 				fetchUserMessages({
// 					limit: PAGE_LIMIT,
// 					beforeTs: oldestTsRef.current,
// 					beforeId: oldestIdRef.current,
// 				})
// 			)
// 			if (res.rows.length) {
// 				setMessages(prev => capList([...(res.rows as Message[]), ...prev]))
// 				oldestTsRef.current = res.oldestTs
// 				oldestIdRef.current = res.oldestId
// 				setHasMore(res.hasMore)
// 			} else {
// 				setHasMore(false)
// 			}
// 		} finally {
// 			setLoadingMore(false)
// 		}
// 	}, [hasMore, loadingMore])

// 	// ---- wysyłka (tworzy chat przy pierwszej wiadomości)
// 	const send = useCallback(
// 		async (text: string, files: File[]) => {
// 			if (sending) return
// 			const trimmed = (text || '').trim()
// 			if (!trimmed && files.length === 0) return

// 			if (trimmed.length > MAX_TEXT_CHARS && files.length === 0) {
// 				const localId = crypto.randomUUID()
// 				setMessages(prev =>
// 					capList([
// 						...prev,
// 						{
// 							id: localId,
// 							chat_id: chatId ?? 'PENDING',
// 							sender_type: 'contact',
// 							body: trimmed,
// 							created_at: new Date().toISOString(),
// 							_localStatus: 'failed',
// 							_error: `Message too long (${trimmed.length}/${MAX_TEXT_CHARS}). Shorten the text and try again.`,
// 						} as Message,
// 					])
// 				)
// 				return
// 			}

// 			setSending(true)
// 			const localId = crypto.randomUUID()
// 			const nowIso = new Date().toISOString()

// 			const optimistic: Message = {
// 				id: localId,
// 				chat_id: chatId ?? 'PENDING',
// 				sender_type: 'contact',
// 				body: trimmed,
// 				created_at: nowIso,
// 				attachments: files.map(f => ({
// 					id: crypto.randomUUID(),
// 					message_id: localId,
// 					file_name: f.name,
// 					file_url: URL.createObjectURL(f),
// 					mime_type: f.type || 'application/octet-stream',
// 					file_size: f.size,
// 					file_path: '',
// 					file: f,
// 				})),
// 			}

// 			setMessages(prev => capList([...prev, optimistic]))

// 			try {
// 				const saved = await withAuthRetry(() => sendUserMessage({ text: trimmed, files }))
// 				if (saved) {
// 					// jeśli to pierwsza wiadomość – właśnie powstał chat
// 					if (!chatId && saved.chat_id) setChatId(saved.chat_id)
// 					setMessages(prev => prev.map(m => (m.id === localId ? ({ ...saved } as Message) : m)))
// 				} else {
// 					setMessages(prev => prev.map(m => (m.id === localId ? ({ ...m, _localStatus: 'failed' } as any) : m)))
// 				}
// 			} catch {
// 				setMessages(prev => prev.map(m => (m.id === localId ? ({ ...m, _localStatus: 'failed' } as any) : m)))
// 			} finally {
// 				setSending(false)
// 			}
// 		},
// 		[chatId, sending]
// 	)

// 	return { chatId, messages, loading, sending, hasMore, loadingMore, loadOlder, send }
// }
