// app/admin/components/sections/messages/ChatList.tsx
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, User as UserIcon, Building2, Mail, UserPlus } from 'lucide-react'
import type { ConversationSummary } from './msgTypes'
import { toIso } from './fetchers/utils'

type Props = {
  activeId: string | null
  onSelect: (id: string) => void
  onToggleUnread?: (id: string, unread: boolean) => void
  items?: ConversationSummary[]
}

/* === helpers === */
const norm = (v?: string | null) => (v ? String(v).toLowerCase() : '')
const digits = (v?: string | number | null) =>
  v === null || v === undefined ? '' : String(v).replace(/\D+/g, '')

const isNewContact = (c: ConversationSummary) => {
  if (typeof c.is_new === 'boolean') return c.is_new
  if (typeof c.total_messages === 'number') return c.total_messages <= 2
  return false
}

const getUnread = (c: ConversationSummary) => {
  const n = Number(c.unread_count ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** snippet: prefer last_message; potem snippet; gdy brak tekstu, ale są załączniki → [photo] */
const getSnippet = (c: ConversationSummary) => {
  const raw = String(c.last_message ?? c.last_message_snippet ?? '').trim()
  const hasAtt =
    (Array.isArray(c.last_message_attachments) && c.last_message_attachments.length > 0) ||
    Boolean(c.last_message_has_attachments)
  return raw || (hasAtt ? '[photo]' : '')
}

/** parse date bezpiecznie (null/invalid → 0) */
const toTime = (ts?: string | null) => {
  if (!ts) return 0
  const t = +new Date(toIso(ts))
  return Number.isFinite(t) ? t : 0
}

/** sort: nowsze -> starsze, stabilnie */
function sortByTimeDesc(a: ConversationSummary, b: ConversationSummary) {
  const at = toTime(a.last_message_at)
  const bt = toTime(b.last_message_at)
  if (bt !== at) return bt - at
  return String(b.id).localeCompare(String(a.id))
}

type Filter = 'new' | 'unread' | null

export default function ChatList({ activeId, onSelect, onToggleUnread, items = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Ctrl/Cmd+K -> focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key?.toLowerCase() === 'k'
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey as any)
    return () => window.removeEventListener('keydown', onKey as any)
  }, [])

  const formatTime = (ts?: string | null) => {
    const t = toTime(ts)
    if (!t) return ''
    const now = Date.now()
    const diffMs = now - t
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 36e5)
    const diffD = Math.floor(diffH / 24)
    if (diffMin < 1) return 'now'
    if (diffH < 1) return `${diffMin}m`
    if (diffH < 24) return `${diffH}h`
    if (diffD < 7) return `${diffD}d`
    try { return new Date(t).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }) } catch { return '' }
  }

  /* badge counts (panel nad listą) */
  const counts = useMemo(() => {
    let newCnt = 0
    let unreadReturning = 0
    for (const c of items) {
      const _isNew = isNewContact(c)
      if (_isNew) newCnt++
      if (getUnread(c) > 0 && !_isNew) unreadReturning++
    }
    return { newCnt, unreadReturning, allCnt: items.length }
  }, [items])

  /* filtrowanie + search + sort */
  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? [...items] : []
    const qRaw = searchQuery.trim()
    const q = qRaw.toLowerCase()
    const qDigits = digits(qRaw)

    const bySearch = !qRaw
      ? base
      : base.filter(c => {
          const name = norm(c.contact_name ?? '')
          const snip = norm(getSnippet(c))
          const email = norm(c.contact_email ?? '')
          const phoneDigits = digits(c.contact_phone ?? '')
          const textMatch = name.includes(q) || snip.includes(q) || email.includes(q)
          const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits)
          return textMatch || phoneMatch
        })

    const byTab = bySearch.filter(c => {
      const _isNew = isNewContact(c)
      if (filter === 'new') return _isNew
      if (filter === 'unread') return getUnread(c) > 0 && !_isNew
      return true
    })

    return byTab.sort(sortByTimeDesc)
  }, [items, searchQuery, filter])

  const toggle = (t: Exclude<Filter, null>) => setFilter(prev => (prev === t ? null : t))

  return (
    <div className="flex flex-col gap-3 font-heebo_regular text-[14px]">
      {/* Toggles */}
      <div className="flex gap-3">
        <button
          type="button"
          aria-pressed={filter === 'new'}
          onClick={() => toggle('new')}
          className={`h-12 rounded-2xl border-2 px-6 flex items-center justify-center gap-3 shadow-md transition-colors
            ${filter === 'new'
              ? 'bg-middle-blue text-white border-middle-blue shadow'
              : 'bg-white text-middle-blue/50 border-transparent hover:border-middle-blue/40 hover:bg-middle-blue/10'}`}
        >
          <UserPlus className="w-5 h-5" />
          <span>
            New:{' '}
            <span className={`font-heebo_bold ${filter === 'new' ? 'text-white' : 'text-middle-blue/90'}`}>
              {counts.newCnt > 99 ? '99+' : counts.newCnt}
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={filter === 'unread'}
          onClick={() => toggle('unread')}
          className={`h-12 rounded-2xl border-2 px-6 flex items-center justify-center gap-3 shadow-md transition-colors
            ${filter === 'unread'
              ? 'bg-middle-blue text-white border-middle-blue shadow'
              : 'bg-white text-middle-blue/50 border-transparent hover:border-middle-blue/40 hover:bg-middle-blue/10'}`}
        >
          <Mail className="w-5 h-5" />
          <span>
            Unread:{' '}
            <span className={`font-heebo_bold ${filter === 'unread' ? 'text-white' : 'text-middle-blue/90'}`}>
              {counts.unreadReturning > 99 ? '99+' : counts.unreadReturning}
            </span>
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          ref={searchRef}
          aria-label="Search chats"
          placeholder="Search (name, email, phone)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-3 pr-10 py-3 bg-white rounded-2xl shadow-md"
        />
        <Search className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-middle-blue/50" />
      </div>

      {/* List */}
      <div
        className="max-h-[70vh] overflow-y-auto custom-scroll flex flex-col gap-3 pr-1"
        role="listbox"
        aria-label="Chats"
      >
        {filtered.length === 0 ? (
          <div className="text-middle-blue/50 text-sm px-2 py-6 text-center">No chats</div>
        ) : (
          filtered.map(c => {
            const isActive = activeId === c.id
            const unread = getUnread(c)
            const isUnread = unread > 0
            const isB2B = c.customer_type === 'b2b'
            const snippet = getSnippet(c)

            return (
              <button
                key={c.id}
                role="option"
                aria-selected={isActive}
                title="Shift+Click / Right-Click — toggle unread"
                onClick={e => {
                  if (e.shiftKey && onToggleUnread) onToggleUnread(c.id, !isUnread)
                  else onSelect(c.id)
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  if (onToggleUnread) onToggleUnread(c.id, !isUnread)
                }}
                className={`w-full rounded-2xl pl-3 p-4 text-left flex items-center gap-4 border-2 transition-colors duration-300 shadow-md
                  ${isActive
                    ? 'bg-middle-blue border-middle-blue text-white'
                    : 'bg-white border-transparent hover:border-middle-blue/40'}`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0
                    ${isActive ? 'bg-white/15' : 'bg-light-blue'}`}
                >
                  {isB2B ? (
                    <Building2 className={`w-5 h-5 ${isActive ? 'text-white' : 'text-middle-blue/75'}`} strokeWidth={1.8} />
                  ) : (
                    <UserIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-middle-blue/75'}`} strokeWidth={1.8} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className={`truncate text-sm font-heebo_medium ${
                          isActive ? 'text-white' : isUnread ? 'text-middle-blue' : 'text-middle-blue/50'
                        }`}
                      >
                        {c.contact_name ?? 'Kontakt'}
                      </span>

                      {isUnread && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); onToggleUnread?.(c.id, false) }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              onToggleUnread?.(c.id, false)
                            }
                          }}
                          className={`inline-flex items-center justify-center rounded-full text-[11px] leading-none font-heebo_regular px-2 py-1 cursor-pointer select-none
                            ${isActive ? 'bg-white/25 text-white' : 'bg-middle-blue text-white'}`}
                          title="Mark as read"
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>

                    <span className={`text-[11px] font-heebo_regular ${isActive ? 'text-white/70' : 'text-middle-blue/75'}`}>
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>

                  <span
                    className={`block truncate text-xs font-heebo_regular mt-0.5 ${
                      isActive ? 'text-white/90' : isUnread ? 'text-middle-blue' : 'text-middle-blue/50'
                    }`}
                    aria-live="polite"
                    title={snippet}
                  >
                    {snippet || '\u00A0'}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
