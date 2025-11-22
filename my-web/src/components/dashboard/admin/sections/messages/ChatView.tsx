// app/admin/components/sections/messages/ChatView.tsx
'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { MessageAttachment } from './msgTypes'
import ChatHeader from './components/ChatHeader'
import MessagesList from './components/MessagesList'
import MessageInput from './components/MessageInput'
import ZoomableImageModal from '@/components/ui/UniversalImageModal'
import ConfirmModal from '@/components/ui/UniversalConfirmModal'
import { useChatMessages } from './hooks/useChatMessages'

// HOOKI scrolla
import { useLoadOlderOnScroll } from './hooks/useLoadOlderOnScroll'
import { useAutoScrollOnAppend } from './hooks/useAutoScrollOnAppend'

type Props = {
	chatId: string
	contactName: string
	onMarkedRead?: (chatId: string) => void
	onMarkedUnread?: (chatId: string, unreadCount: number) => void
	onLastPreview?: (chatId: string, preview: string, atIso: string) => void
}

type AnyAttachment = MessageAttachment & { file?: File }

export default function ChatView({ chatId, contactName, onMarkedRead, onMarkedUnread, onLastPreview }: Props) {
	const [text, setText] = useState('')
	const [attachments, setAttachments] = useState<AnyAttachment[]>([])
	const [preview, setPreview] = useState<string | null>(null)
	const [copiedId, setCopiedId] = useState<string | null>(null)
	const [confirm, setConfirm] = useState<{ msgId: string; att: AnyAttachment } | null>(null)
	const [confirmDel, setConfirmDel] = useState<string | null>(null)

	const {
		messages,
		unreadCount,
		firstUnreadIdx,
		loading,
		loadingMore,
		marking,
		isMine,
		canDeleteMsg,
		loadOlder,
		send,
		toggleRead,
		handleDeleteAttachment,
		handleDeleteMessage,
		justAppendedRef,
		sending,
		// ⛔️ NIE PRZEKAZUJEMY onLastPreview do hooka – wywołamy to niżej w useEffect
	} = useChatMessages(chatId, {
		onMarkedRead,
		onMarkedUnread,
	})

	// refs do scrolla
	const listRef = useRef<HTMLDivElement>(null)

	// --- KOTWICZENIE PO DOGRANIU STARSZYCH (tylko tutaj! hook nie dotyka scrollTop)
	const loadOlderAnchored = useCallback(async () => {
		const el = listRef.current
		if (!el) return
		const prevTop = el.scrollTop
		const prevHeight = el.scrollHeight
		const before = prevHeight

		const added = await loadOlder() // ile faktycznie doszło na górze
		if (!added) return

		requestAnimationFrame(() => {
			const node = listRef.current
			if (!node) return
			const newHeight = node.scrollHeight
			const delta = newHeight - before
			node.scrollTop = prevTop + delta
		})
	}, [loadOlder])

	// scroll: dociąganie + auto-zjazd tylko przy APPEND
	useLoadOlderOnScroll(listRef, loadOlderAnchored, 64)
	useAutoScrollOnAppend(listRef, messages.length, justAppendedRef, true)

	// --- EXTRA: bardzo defensywny „initial scroll to bottom” po zmianie czatu
	const didInitialRef = useRef<string | null>(null)
	useEffect(() => {
		didInitialRef.current = null
	}, [chatId])
	useEffect(() => {
		const el = listRef.current
		if (!el) return
		if (messages.length === 0) return
		if (didInitialRef.current === chatId) return

		requestAnimationFrame(() => {
			try {
				el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
			} catch {
				;(el as any).scrollTop = el.scrollHeight
			}
			didInitialRef.current = chatId
		})
	}, [chatId, messages.length])

	// ✅ TU aktualizujemy preview listy czatów – PO renderze, bez łamania zasad Reacta
	useEffect(() => {
		if (!onLastPreview) return
		const lastMsg: any = messages.length ? messages[messages.length - 1] : undefined
		if (!lastMsg) return
		const text = lastMsg.body?.trim?.()
			? String(lastMsg.body).trim().slice(0, 160)
			: lastMsg.attachments?.length
			? '[attachment]'
			: ''
		onLastPreview(chatId, text, lastMsg.created_at)
	}, [chatId, messages.length, onLastPreview]) // zależność po długości listy wystarczy (nowa ostatnia wiadomość)

	const onCopy = (id: string) => {
		const m = (messages as any[]).find(x => x.id === id)
		const body = (m?.body || '').trim()
		if (!body) return
		navigator.clipboard
			.writeText(body)
			.then(() => {
				setCopiedId(id)
				setTimeout(() => setCopiedId(null), 1200)
			})
			.catch(() => {})
	}

	return (
		<div className='flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-br from-white to-light-blue/70 p-2 rounded-xl'>
			<ChatHeader contactName={contactName} unreadCount={unreadCount} marking={marking} onToggleRead={toggleRead} />

			<div
				ref={listRef}
				className='grow min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scroll p-4'>
				<div className='min-h-full flex flex-col gap-3 justify-end'>
					{loading && !messages.length ? (
						<div className='text-center text-middle-blue/50 py-6'>Loading messages…</div>
					) : (
						<>
							<MessagesList
								messages={messages}
								firstUnreadIdx={firstUnreadIdx}
								isMine={isMine}
								canDeleteMsg={canDeleteMsg}
								copiedId={copiedId}
								onCopy={onCopy}
								onDeleteMessage={id => setConfirmDel(id)}
								onPreview={setPreview}
								onDeleteAttachment={(msgId, att) => setConfirm({ msgId, att: att as AnyAttachment })}
							/>

							{loadingMore && <div className='text-center text-middle-blue/40 text-xs'>Loading older…</div>}
						</>
					)}
				</div>
			</div>

			<MessageInput
				text={text}
				setText={setText}
				attachments={attachments}
				setAttachments={setAttachments}
				onSend={async () => {
					await send({ text, atts: attachments })
					setText('')
					setAttachments([])
				}}
				sending={sending}
				onPreview={setPreview}
			/>

			{preview && <ZoomableImageModal selectedPhoto={preview} onClose={() => setPreview(null)} />}

			<ConfirmModal
				open={!!confirm}
				title='Delete attachment?'
				description='This action cannot be undone.'
				confirmText='Delete'
				cancelText='Cancel'
				onCancel={() => setConfirm(null)}
				onConfirm={async () => {
					const c = confirm
					if (!c) return
					setConfirm(null)
					if (c.msgId === 'LOCAL') {
						setAttachments(prev => prev.filter(a => a.id !== c.att.id))
						return
					}
					await handleDeleteAttachment(c.msgId, c.att)
				}}
			/>
			<ConfirmModal
				open={!!confirmDel}
				title='Delete message?'
				description='This action cannot be undone.'
				confirmText='Delete'
				cancelText='Cancel'
				onCancel={() => setConfirmDel(null)}
				onConfirm={async () => {
					const id = confirmDel!
					setConfirmDel(null)
					await handleDeleteMessage(id)
				}}
			/>
		</div>
	)
}
