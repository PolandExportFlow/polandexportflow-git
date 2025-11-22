// // common/Chat/ChatWidgetUD.tsx
// 'use client'
// import React, { useState, useEffect, useRef, useCallback } from 'react'
// import { Paperclip, FileText, X, User, Headphones, SendHorizontal } from 'lucide-react'
// import { UniversalDetail } from '@/components/ui/UniversalDetail'

// import { getExistingChatId } from './fetchers/createOrGetChat'
// import { fetchUserMessages } from './fetchers/fetchUserMessages'
// import { sendUserMessage } from './fetchers/sendUserMessage'
// import { subscribeRealtime } from './fetchers/subscribeRealtime'
// import { markReadMessage } from './fetchers/markReadMessage'
// import { supabase } from '@/utils/supabase/client'

// import { isImg, dlUrl, formatTimeHM, formatDayLabel, isSameDayTZ, getBrowserTZ } from './shared'
// import type { Message as CoreMessage, MessageAttachment as CoreAttachment } from './userMsgTypes'
// import ZoomableImageModal from '@/components/ui/UniversalImageModal'
// import { useLoadOlderOnScroll } from '../../admin/sections/messages/hooks/useLoadOlderOnScroll'

// /* ===== Types ===== */
// interface Message {
// 	id: string
// 	chat_id: string
// 	sender_id: string
// 	sender_type: 'customer' | 'support'
// 	content: string
// 	message_type: 'text' | 'image' | 'file'
// 	file_url?: string
// 	file_name?: string
// 	created_at: string
// 	is_read: boolean
// }

// /* ===== Auth helpers ===== */
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
// 		} catch {}
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
// 			} catch {}
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

// /* ===== Helpers ===== */
// const pickType = (att?: { mime_type?: string; file_name?: string }): 'text' | 'image' | 'file' => {
// 	if (!att) return 'text'
// 	return isImg(att?.mime_type || att?.file_name || '') ? 'image' : 'file'
// }
// const mapCoreToWidget = (m: CoreMessage): Message => {
// 	const att = m.attachments?.[0]
// 	return {
// 		id: m.id,
// 		chat_id: m.chat_id,
// 		sender_id: '',
// 		sender_type: m.sender_type === 'contact' ? 'customer' : 'support',
// 		content: m.body || '',
// 		message_type: pickType(att),
// 		file_url: att?.file_url || undefined,
// 		file_name: att?.file_name || undefined,
// 		created_at: m.created_at,
// 		is_read: Boolean((m as any)?.is_read || (m as any)?.is_read_by_contact || (m as any)?.read_by_contact_at),
// 	}
// }
// const sortAscByCreated = <T extends { created_at: string }>(arr: T[]) =>
// 	[...arr].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
// const upsertById = (list: Message[], item: Message) => {
// 	const i = list.findIndex(m => m.id === item.id)
// 	if (i === -1) return sortAscByCreated([...list, item])
// 	const copy = list.slice()
// 	copy[i] = { ...copy[i], ...item }
// 	return sortAscByCreated(copy)
// }
// const mergeAttachmentIntoMessage = (prev: Message[], msgId: string, att: CoreAttachment): Message[] =>
// 	sortAscByCreated(
// 		prev.map(m =>
// 			m.id !== msgId
// 				? m
// 				: {
// 						...m,
// 						message_type: pickType({ mime_type: att.mime_type, file_name: att.file_name }),
// 						file_url: att.file_url || m.file_url,
// 						file_name: att.file_name || m.file_name,
// 				  }
// 		)
// 	)
// const dedupeById = (arr: Message[]) => {
// 	const map = new Map<string, Message>()
// 	for (const m of arr) map.set(m.id, m)
// 	return Array.from(map.values())
// }

// /* ===== Component ===== */
// export default function ChatWidgetUD() {
// 	const tz = getBrowserTZ()

// 	const [chatId, setChatId] = useState<string | null>(null)
// 	const [message, setMessage] = useState('')
// 	const [messages, setMessages] = useState<Message[]>([])
// 	const [isLoading, setIsLoading] = useState(false)
// 	const [loadingMore, setLoadingMore] = useState(false)
// 	const [hasMore, setHasMore] = useState(true)

// 	const [selectedFiles, setSelectedFiles] = useState<File[]>([])
// 	const [isUploadDragOver, setIsUploadDragOver] = useState(false)
// 	const [preview, setPreview] = useState<string | null>(null)

// 	const fileInputRef = useRef<HTMLInputElement>(null)
// 	const listRef = useRef<HTMLDivElement>(null)

// 	// paginacja (keyset)
// 	const oldestTsRef = useRef<string | null>(null)
// 	const oldestIdRef = useRef<string | null>(null)

// 	// autoscroll
// 	const prevLenRef = useRef<number>(0)
// 	const justAppendedRef = useRef<boolean>(false)
// 	const didInitialScrollRef = useRef<boolean>(false)

// 	// READ throttling
// 	const lastMarkRef = useRef(0)
// 	const canMarkNow = () => Date.now() - lastMarkRef.current > 1200
// 	const markAgentRead = useCallback(async () => {
// 		if (!chatId) return
// 		if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
// 		if (!canMarkNow()) return
// 		lastMarkRef.current = Date.now()
// 		try {
// 			await withAuthRetry(() => markReadMessage(chatId))
// 		} catch (e) {
// 			console.warn('[widget] markReadMessage failed', e)
// 		}
// 	}, [chatId])

// 	// SCROLL helpers
// 	const SCROLL_EPS = 8
// 	const isNearBottom = (el: HTMLElement) => Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < SCROLL_EPS
// 	const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
// 		const el = listRef.current
// 		if (!el) return
// 		try {
// 			el.scrollTo({ top: el.scrollHeight, behavior })
// 		} catch {
// 			;(el as any).scrollTop = el.scrollHeight
// 		}
// 	}
// 	const scrollAfterLayout = (force = false) => {
// 		const el = listRef.current
// 		if (!el) return
// 		requestAnimationFrame(() => {
// 			requestAnimationFrame(() => {
// 				const should = force || isNearBottom(el)
// 				if (should) scrollToBottom(force ? 'auto' : 'smooth')
// 			})
// 		})
// 	}
// 	const scrollToBottomMaybe = (mode: 'force' | 'soft' = 'soft') => {
// 		scrollAfterLayout(mode === 'force')
// 	}

// 	/* ===== Keep-alive sesji ===== */
// 	useEffect(() => startAuthKeepAlive(45_000, 90), [])

// 	/* ===== INIT ===== */
// 	useEffect(() => {
// 		let alive = true
// 		;(async () => {
// 			setIsLoading(true)
// 			justAppendedRef.current = false
// 			didInitialScrollRef.current = false

// 			try {
// 				const { chatId: existing } = await withAuthRetry(() => getExistingChatId()).catch(() => ({
// 					chatId: null as any,
// 				}))
// 				if (!alive) return
// 				setChatId(existing || null)

// 				if (existing) {
// 					const res = await withAuthRetry(() => fetchUserMessages({ limit: 12 })).catch(() => ({
// 						rows: [] as CoreMessage[],
// 						oldestTs: null,
// 						oldestId: null,
// 						hasMore: false,
// 					}))

// 					oldestTsRef.current = res.oldestTs ?? null
// 					oldestIdRef.current = res.oldestId ?? null
// 					setHasMore(Boolean(res.hasMore))

// 					const initial = sortAscByCreated(dedupeById((res.rows || []).map(mapCoreToWidget)))
// 					setMessages(initial)
// 					await markAgentRead()
// 				} else {
// 					oldestTsRef.current = null
// 					oldestIdRef.current = null
// 					setHasMore(false)
// 					setMessages([])
// 				}

// 				scrollAfterLayout(true)
// 				didInitialScrollRef.current = true
// 			} finally {
// 				if (alive) setIsLoading(false)
// 			}
// 		})()
// 		return () => {
// 			alive = false
// 		}
// 	}, [markAgentRead])

// 	/* ===== REALTIME ===== */
// 	useEffect(() => {
// 		if (!chatId) return
// 		let unsub: null | (() => void) = null
// 		;(async () => {
// 			await ensureSession()
// 			unsub = subscribeRealtime(
// 				chatId,
// 				(row: CoreMessage) => {
// 					const mapped = mapCoreToWidget(row)
// 					justAppendedRef.current = true
// 					setMessages(prev => upsertById(prev, mapped))
// 					if (mapped.sender_type === 'support') {
// 						scrollToBottomMaybe('force')
// 						markAgentRead()
// 					} else {
// 						scrollToBottomMaybe('soft')
// 					}
// 				},
// 				(msgId: string, att: CoreAttachment) => {
// 					justAppendedRef.current = true
// 					setMessages(prev => {
// 						const next = mergeAttachmentIntoMessage(prev, msgId, att)
// 						const target = next.find(m => m.id === msgId)
// 						if (target?.sender_type === 'support') {
// 							scrollToBottomMaybe('force')
// 							markAgentRead()
// 						} else {
// 							scrollToBottomMaybe('soft')
// 						}
// 						return next
// 					})
// 				}
// 			)
// 		})()

// 		const onFocus = () => {
// 			markAgentRead()
// 		}
// 		const onVisibility = () => {
// 			if (document.visibilityState === 'visible') markAgentRead()
// 		}
// 		window.addEventListener('focus', onFocus)
// 		document.addEventListener('visibilitychange', onVisibility)
// 		return () => {
// 			try {
// 				unsub && unsub()
// 			} catch {}
// 			window.removeEventListener('focus', onFocus)
// 			document.removeEventListener('visibilitychange', onVisibility)
// 		}
// 	}, [chatId, markAgentRead])

// 	/* ===== Paginacja ===== */
// 	const loadOlderRaw = useCallback(async () => {
// 		if (!hasMore || loadingMore) return 0
// 		setLoadingMore(true)
// 		try {
// 			const res = await withAuthRetry(() =>
// 				fetchUserMessages({ limit: 12, beforeTs: oldestTsRef.current, beforeId: oldestIdRef.current })
// 			)
// 			const older = sortAscByCreated((res.rows || []).map(mapCoreToWidget))
// 			if (older.length) {
// 				setMessages(prev => sortAscByCreated(dedupeById([...older, ...prev])))
// 				oldestTsRef.current = res.oldestTs ?? oldestTsRef.current
// 				oldestIdRef.current = res.oldestId ?? oldestIdRef.current
// 				setHasMore(Boolean(res.hasMore))
// 				return older.length
// 			} else {
// 				setHasMore(false)
// 				return 0
// 			}
// 		} finally {
// 			setLoadingMore(false)
// 		}
// 	}, [hasMore, loadingMore])

// 	const loadOlderAnchored = useCallback(async () => {
// 		const el = listRef.current
// 		if (!el) return
// 		const prevTop = el.scrollTop
// 		const prevHeight = el.scrollHeight
// 		const added = await loadOlderRaw()
// 		if (!added) return
// 		requestAnimationFrame(() => {
// 			const node = listRef.current
// 			if (!node) return
// 			const delta = node.scrollHeight - prevHeight
// 			node.scrollTop = prevTop + delta
// 		})
// 	}, [loadOlderRaw])

// 	useLoadOlderOnScroll(listRef, loadOlderAnchored, 64)

// 	// auto scroll DO DOŁU
// 	useEffect(() => {
// 		const grew = messages.length > prevLenRef.current
// 		const changed = grew || justAppendedRef.current
// 		if (!didInitialScrollRef.current && messages.length > 0) {
// 			prevLenRef.current = messages.length
// 			justAppendedRef.current = false
// 			return
// 		}
// 		if (changed) scrollToBottomMaybe('soft')
// 		prevLenRef.current = messages.length
// 		justAppendedRef.current = false
// 	}, [messages])

// 	// mark read przy przewinięciu na dół
// 	useEffect(() => {
// 		const el = listRef.current
// 		if (!el) return
// 		const onScroll = () => {
// 			if (isNearBottom(el)) markAgentRead()
// 		}
// 		el.addEventListener('scroll', onScroll, { passive: true })
// 		return () => {
// 			el.removeEventListener('scroll', onScroll)
// 		}
// 	}, [chatId, messages, markAgentRead])

// 	/* ===== Sending ===== */
// 	const handleSend = async () => {
// 		if (!message.trim() && selectedFiles.length === 0) return
// 		setIsLoading(true)
// 		try {
// 			const saved = await withAuthRetry(() => sendUserMessage({ text: message, files: selectedFiles }))
// 			if (saved.chat_id && !chatId) setChatId(saved.chat_id)
// 			setMessages(prev => upsertById(prev, mapCoreToWidget(saved)))
// 			setMessage('')
// 			setSelectedFiles([])
// 			if (fileInputRef.current) fileInputRef.current.value = ''
// 			scrollAfterLayout(true)
// 		} catch (e) {
// 			console.warn('[chat] sendUserMessage failed:', e)
// 		} finally {
// 			setIsLoading(false)
// 		}
// 	}

// 	const addFiles = (files: FileList | File[]) => {
// 		const validFiles = Array.from(files).filter(
// 			f =>
// 				f.type.startsWith('image/') ||
// 				f.type === 'application/pdf' ||
// 				f.type.includes('document') ||
// 				f.type === 'text/plain'
// 		)
// 		setSelectedFiles(prev => [...prev, ...validFiles])
// 	}
// 	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
// 		if (event.target.files?.length) addFiles(event.target.files)
// 		if (fileInputRef.current) fileInputRef.current.value = ''
// 	}
// 	const handleUploadDragOver = (e: React.DragEvent) => {
// 		e.preventDefault()
// 		e.stopPropagation()
// 		setIsUploadDragOver(true)
// 	}
// 	const handleUploadDragLeave = (e: React.DragEvent) => {
// 		e.preventDefault()
// 		e.stopPropagation()
// 		setIsUploadDragOver(false)
// 	}
// 	const handleUploadDrop = (e: React.DragEvent) => {
// 		e.preventDefault()
// 		e.stopPropagation()
// 		setIsUploadDragOver(false)
// 		if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
// 	}

// 	/* ===== UI grouping (ASC) ===== */
// 	const groupedMessages = messages.reduce((acc, msg, idx) => {
// 		const prev = messages[idx - 1]
// 		const shouldGroup =
// 			prev &&
// 			prev.sender_type === msg.sender_type &&
// 			new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000

// 		if (shouldGroup) acc[acc.length - 1].messages.push(msg)
// 		else acc.push({ sender_type: msg.sender_type, messages: [msg], created_at: msg.created_at })
// 		return acc
// 	}, [] as Array<{ sender_type: 'customer' | 'support'; messages: Message[]; created_at: string }>)

// 	/* ===== Render (UniversalDetail) ===== */
// 	return (
// 		<UniversalDetail
// 			title='Live Chat Support'
// 			icon={<Headphones className='w-5 h-5' />}
// 			headerExtra={
// 				<div className='flex items-center gap-2 mr-3'>
// 					<p className='hidden md:inline opacity-75'>Direct contact with our team - real people, ready to help.</p>
// 					<div className='relative ml-1'>
// 						<div className='w-3 h-3 rounded-full bg-green'></div>
// 						<div className='absolute inset-0 w-3 h-3 rounded-full animate-ping-slow bg-green/70'></div>
// 					</div>
// 				</div>
// 			}
// 			collapsible
// 			defaultOpen
// 			defaultOpenMobile>
// 			{/* Messages */}
// 			<div
// 				ref={listRef}
// 				className='h-[520px] overflow-y-auto custom-scroll'
// 				onDragOver={handleUploadDragOver}
// 				onDragLeave={handleUploadDragLeave}
// 				onDrop={handleUploadDrop}>
// 				<div className='flex flex-col gap-2'>
// 					{isLoading && !messages.length ? (
// 						<div className='text-center text-middle-blue/50 py-6'>Loading messages…</div>
// 					) : messages.length === 0 ? (
// 						<div className='text-center text-middle-blue/40 py-6'>No messages</div>
// 					) : (
// 						groupedMessages
// 							.filter(group => group.messages.some(m => (m.content?.trim()?.length ?? 0) > 0 || m.file_name))
// 							.map((group, groupIdx) => {
// 								const isCustomer = group.sender_type === 'customer'
// 								const prev = groupedMessages[groupIdx - 1]
// 								const needDayDivider = !prev || !isSameDayTZ(prev.created_at, group.created_at, tz)

// 								return (
// 									<div key={`group-${groupIdx}`}>
// 										{needDayDivider && (
// 											<div className='text-center my-3'>
// 												<span className='px-3 py-1 text-[11px] rounded-full bg-white border border-middle-blue/10 text-middle-blue/70 shadow-sm'>
// 													{formatDayLabel(group.created_at, tz)}
// 												</span>
// 											</div>
// 										)}

// 										<div className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
// 											{/* Sender */}
// 											<div className={`flex items-center gap-2 mb-1 ${isCustomer ? 'flex-row-reverse' : ''}`}>
// 												<div
// 													className={`w-6 h-6 rounded-full grid place-items-center ${
// 														isCustomer
// 															? 'bg-middle-blue text-white'
// 															: 'bg-white text-middle-blue border border-light-blue'
// 													}`}>
// 													{isCustomer ? <User className='w-3 h-3' /> : <Headphones className='w-3 h-3' />}
// 												</div>
// 												<span className='font-heebo_regular text-[12px] text-middle-blue'>
// 													{isCustomer ? 'You' : 'Support'}
// 												</span>
// 											</div>

// 											{/* Messages in group */}
// 											{group.messages.map((msg, msgIdx) => (
// 												<div key={msg.id} className={`max-w-[80%] mb-1 ${isCustomer ? 'text-right' : ''}`}>
// 													<div
// 														className={`p-3 md:p-4 rounded-lg ${
// 															isCustomer
// 																? 'bg-middle-blue text-white'
// 																: 'bg-white border border-light-blue text-middle-blue'
// 														}`}>
// 														{msg.content && (
// 															<span
// 																className={`font-heebo_regular text-[14px] leading-relaxed tracking-wide ${
// 																	isCustomer ? 'text-white/80' : 'text-middle-blue/80'
// 																}`}>
// 																{msg.content}
// 															</span>
// 														)}

// 														{msg.file_name && msg.file_url && (
// 															<div className='mt-2'>
// 																{msg.message_type === 'image' ? (
// 																	<img
// 																		src={msg.file_url}
// 																		alt={msg.file_name}
// 																		className='w-32 h-32 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity border border-light-blue/60 bg-white'
// 																		onClick={() => setPreview(msg.file_url!)}
// 																		onLoad={() => {
// 																			scrollToBottomMaybe('force')
// 																		}}
// 																	/>
// 																) : (
// 																	<a
// 																		href={dlUrl(msg.file_url, msg.file_name)}
// 																		download
// 																		className='inline-flex items-center gap-2 px-3 py-2 bg-light-blue/16 rounded-md hover:bg-light-blue/28 transition-colors'>
// 																		<FileText className='w-4 h-4' />
// 																		<span className='font-heebo_regular text-sm'>{msg.file_name}</span>
// 																	</a>
// 																)}
// 															</div>
// 														)}

// 														{/* Time (ostatnia w grupie) */}
// 														{msgIdx === group.messages.length - 1 && (
// 															<div
// 																className={`mt-2 text-[10px] font-heebo_regular ${
// 																	isCustomer ? 'text-white/75' : 'text-middle-blue/60'
// 																}`}>
// 																{formatTimeHM(msg.created_at, tz)}
// 															</div>
// 														)}
// 													</div>
// 												</div>
// 											))}
// 										</div>
// 									</div>
// 								)
// 							})
// 					)}
// 					{loadingMore && <div className='text-center text-middle-blue/40 text-xs py-2'>Loading older…</div>}
// 				</div>
// 			</div>

// 			{/* Input */}
// 			<div className='mt-4 border-t border-light-blue pt-3'>
// 				<input
// 					ref={fileInputRef}
// 					type='file'
// 					className='hidden'
// 					onChange={handleFileSelect}
// 					accept='image/*,.pdf,.doc,.docx,.txt'
// 					multiple
// 				/>

// 				{selectedFiles.length > 0 && (
// 					<div className='mb-2 flex gap-3 flex-wrap items-start'>
// 						{selectedFiles.map((file, index) => (
// 							<div key={`${file.name}-${index}`} className='relative group/image'>
// 								{file.type.startsWith('image/') ? (
// 									<img
// 										src={URL.createObjectURL(file)}
// 										alt={file.name}
// 										className='w-20 h-20 rounded-md object-cover hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md cursor-pointer border border-light-blue/60 bg-white'
// 										draggable={false}
// 										onClick={() => setPreview(URL.createObjectURL(file))}
// 									/>
// 								) : (
// 									<div className='w-20 h-20 bg-light-blue/24 rounded-md border border-light-blue/60 grid place-items-center cursor-default'>
// 										<span className='text-middle-blue font-medium text-xs'>
// 											{file.name?.split('.').pop()?.toUpperCase() || 'FILE'}
// 										</span>
// 									</div>
// 								)}
// 								<button
// 									onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
// 									className='absolute -top-2 -right-2 bg-middle-blue/70 hover:bg-red text-white rounded-full w-5 h-5 grid place-items-center text-xs transition'
// 									title='Remove file'>
// 									<X className='w-4 h-4' />
// 								</button>
// 							</div>
// 						))}
// 					</div>
// 				)}

// 				<div className='flex gap-1'>
// 					<button
// 						onClick={() => fileInputRef.current?.click()}
// 						className='p-3 rounded-md bg-white border border-light-blue hover:bg-light-blue/16 transition-colors'
// 						aria-label='Add attachment'
// 						title='Add attachment'>
// 						<Paperclip className='w-5 h-5 text-middle-blue/70' />
// 					</button>

// 					<textarea
// 						value={message}
// 						onChange={e => setMessage(e.target.value)}
// 						onKeyDown={e => {
// 							if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && !e.shiftKey)) {
// 								e.preventDefault()
// 								handleSend()
// 							} else if (e.key === 'Escape') {
// 								setMessage('')
// 								setSelectedFiles([])
// 								if (fileInputRef.current) fileInputRef.current.value = ''
// 							}
// 						}}
// 						onPaste={e => {
// 							const files = Array.from(e.clipboardData.files || [])
// 							if (files.length) {
// 								e.preventDefault()
// 								const valid = files.filter(
// 									f =>
// 										f.type.startsWith('image/') ||
// 										f.type === 'application/pdf' ||
// 										f.type.includes('document') ||
// 										f.type === 'text/plain'
// 								)
// 								setSelectedFiles(prev => [...prev, ...valid])
// 							}
// 						}}
// 						placeholder='Message'
// 						className='flex-1 min-h[60px] min-h-[60px] resize-y rounded-md border border-light-blue bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-middle-blue'
// 					/>

// 					<button
// 						onClick={handleSend}
// 						disabled={!message.trim() && selectedFiles.length === 0}
// 						className='px-6 rounded-md bg-middle-blue text-white font-made_light text-[14px] hover:bg-middle-blue/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2'>
// 						<span>Send</span>
// 						<SendHorizontal className='w-4 h-4' />
// 					</button>
// 				</div>
// 			</div>

// 			{/* Drop overlay */}
// 			{isUploadDragOver && (
// 				<div className='absolute inset-0 rounded-lg border-2 border-dashed border-red/70 bg-red/5 grid place-items-center z-50'>
// 					<div className='text-red font-made_regular text-sm md:text-base'>Drop files here to upload</div>
// 				</div>
// 			)}

// 			{preview && <ZoomableImageModal selectedPhoto={preview} onClose={() => setPreview(null)} />}
// 		</UniversalDetail>
// 	)
// }
