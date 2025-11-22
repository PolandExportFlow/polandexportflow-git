// app/admin/components/sections/messages/hooks/useChatMessages.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type { Message, MessageAttachment } from '../msgTypes'
import { toIso, nowIso, capList, dedupeById, getIsRead, withReadFlag, withoutReadFlag } from '../fetchers/utils'
import { fetchChatMessages, getChatCache, setChatCache } from '../fetchers/messages/fetchChatMessages'
import { deleteAttachment } from '../fetchers/attachments/deleteAttachment'
import { deleteMessage, sendMessage, subscribeMessages, markRead, markUnread } from '../fetchers/messages'

const SEND_TIMEOUT_MS = 30_000
const INITIAL_LIMIT = 12
const PAGE_LIMIT = 12
const CACHE_CAP = 300

type AnyAttachment = MessageAttachment & { file?: File }

function withTimeout<T>(p: Promise<T>, ms = SEND_TIMEOUT_MS): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('timeout')), ms)
		p.then(v => {
			clearTimeout(t)
			resolve(v)
		}).catch(e => {
			clearTimeout(t)
			reject(e)
		})
	})
}
const errMsg = (e: unknown) => String((e as any)?.message || (e as any)?.error || e || '')
const isAuthError = (e: unknown) => /jwt|token|session|auth/i.test(errMsg(e))

async function ensureSession() {
	const {
		data: { session },
	} = await supabase.auth.getSession()
	const nowSec = Math.floor(Date.now() / 1000)
	const expSec = Number((session as any)?.expires_at) || 0
	if (!session || expSec - nowSec < 60) {
		try {
			await supabase.auth.refreshSession()
		} catch {}
	}
}

async function sendWithRetry(args: { chatId: string; text: string; files: File[] }) {
	await ensureSession()
	try {
		return await withTimeout(sendMessage(args), SEND_TIMEOUT_MS)
	} catch (e) {
		if (isAuthError(e)) {
			try {
				await supabase.auth.refreshSession()
			} catch {}
			return await withTimeout(sendMessage(args), SEND_TIMEOUT_MS)
		}
		throw e
	}
}

// === normalizacja nadawcy do dwóch wartości w UI ===
const normalizeSender = (v: string | undefined): 'user' | 'contact' => (v === 'contact' ? 'contact' : 'user')

export function useChatMessages(
	chatId: string,
	opts?: {
		onMarkedRead?: (chatId: string) => void
		onMarkedUnread?: (chatId: string, unreadCount: number) => void
		// ⚠️ onLastPreview usunięte z hooka (wywołujemy je w ChatView.useEffect)
	}
) {
	const { onMarkedRead, onMarkedUnread } = opts || {}

	const [messages, setMessages] = useState<Message[]>([])
	const [loading, setLoading] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const hasMoreRef = useRef(true)
	const [sending, setSending] = useState(false)
	const [marking, setMarking] = useState<'idle' | 'read' | 'unread'>('idle')

	// auth/permissions
	const [isAdmin, setIsAdmin] = useState(false)
	const [userId, setUserId] = useState<string | null>(null)

	// paginacja
	const oldestTsRef = useRef<string | null>(null)
	const oldestIdRef = useRef<string | null>(null)

	// autoscroll tylko przy APPEND
	const justAppendedRef = useRef(false)

	// unread sygnał dla listy czatów
	const prevUnreadRef = useRef<number>(0)

	// ===== permissions =====
	useEffect(() => {
		let alive = true
		const compute = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			const u = session?.user
			const myId = u?.id || null
			let admin = false

			const metaClass = (u?.app_metadata as any)?.class ?? (u?.user_metadata as any)?.class
			if (String(metaClass || '').toLowerCase() === 'admin') admin = true

			if (!admin && myId) {
				const { data: row } = await supabase.from('users').select('is_admin').eq('id', myId).maybeSingle()
				if (row?.is_admin) admin = true
			}
			if (!admin && myId) {
				const { data: au } = await supabase
					.from('admin_users')
					.select('role')
					.eq('user_id', myId)
					.in('role', ['admin', 'manager'])
					.maybeSingle()
				if (au) admin = true
			}

			if (alive) {
				setUserId(myId)
				setIsAdmin(admin)
			}
		}
		compute()
		const { data: sub } = supabase.auth.onAuthStateChange(compute)
		return () => {
			sub?.subscription.unsubscribe()
		}
	}, [])

	const isMine = useCallback(
		(m: Message) => {
			if (m.sender_id && userId) return m.sender_id === userId
			return normalizeSender(m.sender_type) === 'user'
		},
		[userId]
	)

	// nie-moich + nieprzeczytane przez agenta
	const isUnreadMsg = useCallback((m: Message) => !isMine(m) && !getIsRead(m, false), [isMine])
	const unreadCount = useMemo(() => messages.filter(isUnreadMsg).length, [messages, isUnreadMsg])

	// sygnał do listy czatów
	useEffect(() => {
		const prev = prevUnreadRef.current
		if (unreadCount !== prev) {
			if (unreadCount > 0) onMarkedUnread?.(chatId, unreadCount)
			else onMarkedRead?.(chatId)
			prevUnreadRef.current = unreadCount
		}
	}, [unreadCount, chatId, onMarkedRead, onMarkedUnread])

	// ===== load + cache + realtime =====
	useEffect(() => {
		let alive = true
		justAppendedRef.current = false

		const cached = getChatCache(chatId) as any
		if (!cached) setLoading(true)

		if (cached) {
			oldestTsRef.current = cached.oldestTs ?? null
			oldestIdRef.current = cached.oldestId ?? null
			setHasMore(cached.hasMore)
			hasMoreRef.current = cached.hasMore
			justAppendedRef.current = true
			const cachedNorm = (cached.list as Message[]).map(m => ({ ...m, sender_type: normalizeSender(m.sender_type) }))
			setMessages(cachedNorm)
			setLoading(false)
		}

		;(async () => {
			try {
				const res = await fetchChatMessages(chatId, { limit: INITIAL_LIMIT })
				if (!alive) return
				oldestTsRef.current = res.oldestTs
				oldestIdRef.current = res.oldestId
				setHasMore(res.hasMore)
				hasMoreRef.current = res.hasMore
				const rows = (res.rows as Message[]).map(m => ({ ...m, sender_type: normalizeSender(m.sender_type) }))
				const capped = capList(rows, CACHE_CAP)
				justAppendedRef.current = true
				setMessages(capped)
				setChatCache(chatId, { list: capped, oldestTs: res.oldestTs, oldestId: res.oldestId, hasMore: res.hasMore })
			} finally {
				if (alive) setLoading(false)
			}
		})()

		const unsub = subscribeMessages({
			chatId,
			setMessages: updater => {
				setMessages(prev => {
					const next = typeof updater === 'function' ? (updater as any)(prev) : updater
					const dedup = dedupeById(next as Message[]).map(m => ({ ...m, sender_type: normalizeSender(m.sender_type) }))
					const capped = capList(dedup, CACHE_CAP)

					// auto-scroll tylko gdy przybyło na końcu
					if ((capped.length ?? 0) > (prev.length ?? 0)) {
						const lastPrev = prev?.[prev.length - 1]
						const lastNext = capped?.[capped.length - 1]
						if (
							lastPrev &&
							lastNext &&
							+new Date(toIso(lastNext.created_at)) >= +new Date(toIso(lastPrev.created_at))
						) {
							justAppendedRef.current = true
						}
					}
					setChatCache(chatId, {
						list: capped,
						oldestTs: oldestTsRef.current,
						oldestId: oldestIdRef.current,
						hasMore: hasMoreRef.current,
					})

					return capped
				})
			},
			// ⛔️ NIE przekazujemy tu żadnego onLastPreview
		})

		return () => {
			try {
				unsub?.()
			} catch {}
		}
	}, [chatId])

	// ===== API: load older (PREPEND) =====
	const loadOlder = useCallback(async (): Promise<number> => {
		if (!hasMore || loadingMore) return 0
		setLoadingMore(true)
		try {
			const res = await fetchChatMessages(chatId, {
				limit: PAGE_LIMIT,
				beforeTs: oldestTsRef.current,
				beforeId: oldestIdRef.current,
			})
			const seen = new Set(messages.map(m => m.id))
			const older = (res.rows as Message[])
				.map(m => ({ ...m, sender_type: normalizeSender(m.sender_type) }))
				.filter(m => !seen.has(m.id))

			if (older.length) {
				const next = capList([...older, ...messages], CACHE_CAP)
				setMessages(next)
				setChatCache(chatId, {
					list: next,
					oldestTs: res.oldestTs,
					oldestId: res.oldestId,
					hasMore: res.hasMore,
				})
			}
			oldestTsRef.current = res.oldestTs
			oldestIdRef.current = res.oldestId
			setHasMore(res.hasMore)
			hasMoreRef.current = res.hasMore

			return older.length
		} finally {
			setLoadingMore(false)
		}
	}, [chatId, hasMore, loadingMore, messages])

	// ===== API: read/unread (agent) =====
	const markAllReadHere = useCallback(async () => {
		if (marking !== 'idle') return
		const snapshot = messages
		const prevUnread = unreadCount
		setMarking('read')
		setMessages(prev => prev.map(m => (!isMine(m) ? withReadFlag(m) : m)))
		onMarkedRead?.(chatId)
		try {
			await markRead(chatId)
		} catch {
			setMessages(snapshot)
			if (prevUnread > 0) onMarkedUnread?.(chatId, prevUnread)
			else onMarkedRead?.(chatId)
		} finally {
			setMarking('idle')
		}
	}, [marking, messages, unreadCount, isMine, onMarkedRead, onMarkedUnread, chatId])

	const markLastAsUnreadHere = useCallback(async () => {
		if (marking !== 'idle') return
		const snapshot = messages
		const prevUnread = unreadCount
		setMarking('unread')
		let changed = false
		setMessages(prev => {
			const copy = [...prev]
			for (let i = copy.length - 1; i >= 0; i--) {
				const m = copy[i]
				if (!isMine(m)) {
					copy[i] = withoutReadFlag(m)
					changed = true
					break
				}
			}
			return copy
		})
		if (changed) onMarkedUnread?.(chatId, 1)
		try {
			await markUnread(chatId)
		} catch {
			setMessages(snapshot)
			if (prevUnread > 0) onMarkedUnread?.(chatId, prevUnread)
			else onMarkedRead?.(chatId)
		} finally {
			setMarking('idle')
		}
	}, [marking, messages, unreadCount, isMine, onMarkedRead, onMarkedUnread, chatId])

	const toggleRead = useCallback(async () => {
		if (unreadCount > 0) await markAllReadHere()
		else await markLastAsUnreadHere()
	}, [unreadCount, markAllReadHere, markLastAsUnreadHere])

	// ===== API: wysyłka / retry / kasowanie =====
	const clearUnreadAfterMySend = useCallback(async () => {
		setMessages(prev => prev.map(m => (!isMine(m) ? withReadFlag(m) : m)))
		onMarkedRead?.(chatId)
		try {
			await markRead(chatId)
		} catch {}
	}, [chatId, isMine, onMarkedRead])

	const send = useCallback(
		async (args: { text: string; atts: AnyAttachment[] }) => {
			const trimmed = (args.text || '').trim()
			const filesToSend = args.atts.map(a => a.file).filter((f): f is File => !!f)
			if (!trimmed && filesToSend.length === 0) return

			if (typeof navigator !== 'undefined' && navigator.onLine === false) {
				const localId = crypto.randomUUID()
				const optimistic = {
					id: localId,
					chat_id: chatId,
					sender_type: 'user',
					body: trimmed,
					created_at: nowIso(),
					attachments: args.atts.length ? (args.atts as MessageAttachment[]) : undefined,
					_localStatus: 'failed',
					_error: 'You are offline',
				} as unknown as Message
				setMessages(prev => capList([...(prev as Message[]), optimistic], CACHE_CAP))
				return
			}

			setSending(true)
			const localId = crypto.randomUUID()
			const optimistic = {
				id: localId,
				chat_id: chatId,
				sender_type: 'user',
				body: trimmed,
				created_at: nowIso(),
				attachments: args.atts.length ? (args.atts as MessageAttachment[]) : undefined,
				_localStatus: 'sending',
			} as unknown as Message

			setMessages(prev => capList([...(prev as Message[]), optimistic], CACHE_CAP))
			try {
				const result: any = await sendWithRetry({ chatId, text: trimmed, files: filesToSend })
				if (result) {
					setMessages(prev => {
						const mapped = prev.map(m =>
							m.id === localId
								? ({
										id: String(result.id),
										chat_id: String(result.chat_id),
										sender_type: normalizeSender(String(result.sender_type)),
										body: String(result.body ?? ''),
										created_at: toIso(result.created_at),
										...(result.is_read_by_agent !== undefined ? { is_read_by_agent: !!result.is_read_by_agent } : {}),
										...(result.read_by_agent_at ? { read_by_agent_at: toIso(result.read_by_agent_at) } : {}),
										...(result.is_read_by_contact !== undefined
											? { is_read_by_contact: !!result.is_read_by_contact }
											: {}),
										...(result.read_by_contact_at ? { read_by_contact_at: toIso(result.read_by_contact_at) } : {}),
										...(result.is_read !== undefined ? { is_read: !!result.is_read } : {}),
										...(result.read_at ? { read_at: toIso(result.read_at) } : {}),
										attachments: ((result.attachments ?? []) as any[]).map((a: any) => ({
											id: String(a.id || crypto.randomUUID()),
											message_id: String(result.id),
											file_name: String(a.file_name),
											file_url: String(a.file_url),
											mime_type: String(a.mime_type || a.file_type || ''),
											file_size: Number(a.file_size ?? 0),
											file_path: a.file_path ?? '',
											created_at: a.created_at ? toIso(a.created_at) : undefined,
										})),
								  } as unknown as Message)
								: m
						)
						return capList(dedupeById(mapped), CACHE_CAP)
					})

					justAppendedRef.current = true
					// ⛔️ NIE wołamy tu onLastPreview – ChatView zrobi to w useEffect
					clearUnreadAfterMySend()
				} else {
					setMessages(prev =>
						prev.map(m =>
							m.id === localId ? ({ ...(m as any), _localStatus: 'failed', _error: 'Unknown error' } as any) : m
						)
					)
				}
			} catch (e) {
				setMessages(prev =>
					prev.map(m => (m.id === localId ? ({ ...(m as any), _localStatus: 'failed', _error: errMsg(e) } as any) : m))
				)
			} finally {
				setSending(false)
			}
		},
		[chatId, clearUnreadAfterMySend]
	)

	const retrySend = useCallback(
		async (failedId: string) => {
			const m = messages.find(x => x.id === failedId)
			if (!m) return
			const files = ((m.attachments as AnyAttachment[] | undefined) ?? [])
				.map(a => a.file)
				.filter((f): f is File => !!f)
			setMessages(prev =>
				prev.map(x => (x.id === failedId ? ({ ...(x as any), _localStatus: 'sending', _error: undefined } as any) : x))
			)
			try {
				const result: any = await sendWithRetry({ chatId, text: m.body || '', files })
				if (result) {
					setMessages(prev => {
						const mapped = prev.map(x =>
							x.id === failedId
								? ({
										id: String(result.id),
										chat_id: String(result.chat_id),
										sender_type: normalizeSender(String(result.sender_type)),
										body: String(result.body ?? ''),
										created_at: toIso(result.created_at),
										...(result.is_read_by_agent !== undefined ? { is_read_by_agent: !!result.is_read_by_agent } : {}),
										...(result.read_by_agent_at ? { read_by_agent_at: toIso(result.read_by_agent_at) } : {}),
										...(result.is_read_by_contact !== undefined
											? { is_read_by_contact: !!result.is_read_by_contact }
											: {}),
										...(result.read_by_contact_at ? { read_by_contact_at: toIso(result.read_by_contact_at) } : {}),
										...(result.is_read !== undefined ? { is_read: !!result.is_read } : {}),
										...(result.read_at ? { read_at: toIso(result.read_at) } : {}),
										attachments: ((result.attachments ?? []) as any[]).map((a: any) => ({
											id: String(a.id || crypto.randomUUID()),
											message_id: String(result.id),
											file_name: String(a.file_name),
											file_url: String(a.file_url),
											mime_type: String(a.mime_type || a.file_type || ''),
											file_size: Number(a.file_size ?? 0),
											file_path: a.file_path ?? '',
											created_at: a.created_at ? toIso(a.created_at) : undefined,
										})),
								  } as unknown as Message)
								: x
						)
						return capList(dedupeById(mapped), CACHE_CAP)
					})
					justAppendedRef.current = true
					// ⛔️ NIE wołamy tu onLastPreview – ChatView zrobi to w useEffect
					clearUnreadAfterMySend()
				} else {
					setMessages(prev =>
						prev.map(x =>
							x.id === failedId ? ({ ...(x as any), _localStatus: 'failed', _error: 'Unknown error' } as any) : x
						)
					)
				}
			} catch (e) {
				setMessages(prev =>
					prev.map(x => (x.id === failedId ? ({ ...(x as any), _localStatus: 'failed', _error: errMsg(e) } as any) : x))
				)
			}
		},
		[messages, chatId, clearUnreadAfterMySend]
	)

	const canDeleteMsg = useCallback((m: Message) => isAdmin && isMine(m), [isAdmin, isMine])

	const handleDeleteAttachment = useCallback(
		async (msgId: string, att: AnyAttachment) => {
			if (!att.message_id || !att.id) return
			const target = messages.find(m => m.id === msgId)
			if (!target || !canDeleteMsg(target)) return

			const snapshot = messages
			const attCount = target.attachments?.length ?? 0
			const hasText = !!target.body && target.body.trim().length > 0
			const isLastAttachment = attCount <= 1

			let nextMsgs: Message[] = []
			if (isLastAttachment && !hasText) nextMsgs = messages.filter(m => m.id !== msgId)
			else
				nextMsgs = messages.map(m =>
					m.id === msgId ? ({ ...m, attachments: (m.attachments || []).filter(a => a.id !== att.id) } as any) : m
				)

			nextMsgs = capList(nextMsgs, CACHE_CAP)
			setMessages(nextMsgs)
			setChatCache(chatId, {
				list: nextMsgs,
				oldestTs: oldestTsRef.current,
				oldestId: oldestIdRef.current,
				hasMore: hasMoreRef.current,
			})

			try {
				await deleteAttachment({ attachmentId: att.id, messageId: msgId })
			} catch {
				setMessages(snapshot)
				setChatCache(chatId, {
					list: snapshot,
					oldestTs: oldestTsRef.current,
					oldestId: oldestIdRef.current,
					hasMore: hasMoreRef.current,
				})
				alert('Could not delete the file.')
			}
		},
		[messages, chatId, canDeleteMsg]
	)

	const handleDeleteMessage = useCallback(
		async (id: string) => {
			const msg = messages.find(m => m.id === id)
			if (!msg) return
			if (!canDeleteMsg(msg)) return
			const snapshot = messages
			const next = capList(
				messages.filter(m => m.id !== id),
				CACHE_CAP
			)
			setMessages(next)
			setChatCache(chatId, {
				list: next,
				oldestTs: oldestTsRef.current,
				oldestId: oldestIdRef.current,
				hasMore: hasMoreRef.current,
			})
			try {
				await deleteMessage(id)
			} catch {
				setMessages(snapshot)
				setChatCache(chatId, {
					list: snapshot,
					oldestTs: oldestTsRef.current,
					oldestId: oldestIdRef.current,
					hasMore: hasMoreRef.current,
				})
				alert('Could not delete the message.')
			}
		},
		[messages, chatId, canDeleteMsg]
	)

	const firstUnreadIdx = useMemo(() => messages.findIndex(m => isUnreadMsg(m)), [messages, isUnreadMsg])

	return {
		// dane
		messages,
		setMessages,
		unreadCount,
		firstUnreadIdx,
		loading,
		loadingMore,
		hasMore,
		sending,
		marking,
		// perms
		isAdmin,
		isMine,
		canDeleteMsg,
		// akcje
		loadOlder, // Promise<number>
		send,
		retrySend,
		markAllReadHere,
		markLastAsUnreadHere,
		toggleRead,
		handleDeleteAttachment,
		handleDeleteMessage,
		// autoscroll (tylko APPEND)
		justAppendedRef,
	}
}
