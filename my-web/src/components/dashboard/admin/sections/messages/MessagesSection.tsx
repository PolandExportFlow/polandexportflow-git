// app/admin/components/sections/messages/MessagesSection.tsx
'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import ChatList from './ChatList'
import ChatView from './ChatView'
import ChatProfileInfo from './ChatProfileInfo'
import type { SectionProps } from '../../types'
import type { ConversationSummary } from './msgTypes'
import { useChats } from './fetchers/chats'
import { toIso } from './fetchers/utils'

const LS_KEY = 'messages:lastActiveChatId'

function pickDefaultChat(list: ConversationSummary[], preferredId?: string | null) {
  if (!Array.isArray(list) || list.length === 0) return null
  if (preferredId && list.some(c => c.id === preferredId)) return preferredId
  const unread = [...list].filter(c => (Number(c.unread_count) || 0) > 0)
  if (unread.length) {
    // bezpiecznie porównujemy czas (null/invalid -> 0)
    unread.sort(
      (a, b) =>
        +new Date(toIso(b.last_message_at)) -
        +new Date(toIso(a.last_message_at))
    )
    return unread[0].id
  }
  return list[0].id
}

export default function MessagesSection({ onNavigate }: SectionProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // wyciągamy setLastPreview, żeby ChatView mógł natychmiast odświeżać listę
  const { chats, loading, error, setUnread, setLastPreview } = useChats()

  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setActiveId(saved)
    } catch {}
  }, [])

  useEffect(() => {
    const list = chats ?? []
    if (!list.length) {
      if (activeId !== null) setActiveId(null)
      return
    }
    if (activeId && list.some(c => c.id === activeId)) return
    let preferred: string | null = activeId
    try {
      if (!preferred) preferred = localStorage.getItem(LS_KEY)
    } catch {}
    const next = pickDefaultChat(list, preferred)
    if (next && next !== activeId) setActiveId(next)
  }, [chats, activeId])

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(LS_KEY, activeId)
    } catch {}
  }, [activeId])

  const handleSelect = useCallback((id: string) => setActiveId(id), [])
  const handleMarkedRead = useCallback((chatId: string) => setUnread(chatId, 0), [setUnread])
  const handleMarkedUnread = useCallback(
    (chatId: string, unreadCount: number = 1) => setUnread(chatId, unreadCount),
    [setUnread]
  )
  const handleToggleUnread = useCallback(
    (chatId: string, unread: boolean) => setUnread(chatId, unread ? 1 : 0),
    [setUnread]
  )

  const activeConv = useMemo(
    () => (chats ?? []).find(c => c.id === activeId),
    [chats, activeId]
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[84vh] min-h-0">
      <div className="lg:col-span-3 overflow-hidden flex flex-col h-full min-h-0">
        <ChatList
          activeId={activeId}
          onSelect={handleSelect}
          onToggleUnread={handleToggleUnread}
          items={chats ?? []}
        />
      </div>

      <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-0">
        {activeId ? (
          <ChatView
            key={activeId}
            chatId={activeId}
            contactName={activeConv?.contact_name ?? 'Conversation'}
            onMarkedRead={handleMarkedRead}
            onMarkedUnread={handleMarkedUnread}
            onLastPreview={setLastPreview} // ← ważne: natychmiastowy preview na liście
          />
        ) : (
          <div className="flex-1 grid place-items-center text-middle-blue/40">
            {loading ? 'Loading…' : error ? 'Failed to load chats.' : 'Select a conversation'}
          </div>
        )}
      </div>

      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm overflow-hidden h-full min-h-0">
        <div className="h-full min-h-0 overflow-y-auto">
          {activeId ? (
            <ChatProfileInfo
              key={activeId}
              chatId={activeId}
              onOpenOrder={() => onNavigate('b2c-orders')}
            />
          ) : (
            <div className="h-full grid place-items-center text-middle-blue/40">
              {loading ? 'Loading…' : 'No chat selected'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
