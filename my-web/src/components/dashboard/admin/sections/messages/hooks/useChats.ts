// app/admin/components/sections/messages/hooks/useChats.ts
'use client'

import { useEffect, useRef, useState, useCallback, Dispatch, SetStateAction } from 'react'
import type { ConversationSummary } from '../msgTypes'
import { fetchChats } from '../fetchers/chats/fetchChats'
import { subscribeChats } from '../fetchers/chats/subscribeChats'
import { toIso } from '../fetchers/utils'

/** Bezpieczny parse czasu (null/invalid -> 0). */
function tsNum(v?: string | null) {
  if (!v) return 0
  const t = +new Date(toIso(v))
  return Number.isFinite(t) ? t : 0
}

/** Ujednolicenie preview labeli (spójne z ChatList). */
function normalizePreviewLabel(s: string) {
  return s === 'Attachment' ? '[photo]' : s
}

/** Tekst do porównań/preview: preferuj last_message, inaczej last_message_snippet. */
function previewOfSummary(c: Partial<ConversationSummary> & Record<string, any>): string {
  const raw = (c.last_message ?? c.last_message_snippet ?? '').trim()
  const txt = normalizePreviewLabel(raw)
  if (txt) return txt
  const hasAtt =
    (Array.isArray(c.last_message_attachments) && c.last_message_attachments.length > 0) ||
    Boolean(c.last_message_has_attachments)
  return hasAtt ? '[photo]' : ''
}

/** Jednolite sortowanie po ostatniej wiadomości (DESC). */
function sortChats<T extends Partial<ConversationSummary>>(arr: T[]): T[] {
  return [...arr].sort((a: any, b: any) => {
    const ta = tsNum(a?.last_message_at)
    const tb = tsNum(b?.last_message_at)
    if (tb !== ta) return tb - ta
    // tie-break po id, żeby wynik był stabilny
    return String(b?.id || '').localeCompare(String(a?.id || ''))
  })
}

/** Porównujemy tylko pola, które wpływają na UI listy. */
function shallowEqualChats(a: ConversationSummary[], b: ConversationSummary[]) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as any
    const y = b[i] as any
    if (x.id !== y.id) return false
    // unread
    const xu = Number(x.unread_count ?? 0)
    const yu = Number(y.unread_count ?? 0)
    if (xu !== yu) return false
    // preview (last_message lub snippet lub [photo])
    const xp = previewOfSummary(x)
    const yp = previewOfSummary(y)
    if (xp !== yp) return false
    // timestamp
    if (String(toIso(x.last_message_at ?? '')) !== String(toIso(y.last_message_at ?? ''))) return false
  }
  return true
}

/** Normalizacja listy pod kątem previewów. */
function normalizeSummaries(list: ConversationSummary[]): ConversationSummary[] {
  return list.map((c) => {
    const raw = (c.last_message ?? c.last_message_snippet ?? '').trim()
    if (!raw) return c
    const norm = normalizePreviewLabel(raw)
    if (norm === raw) return c
    return {
      ...c,
      last_message: norm,
      last_message_snippet: norm,
    }
  })
}

export function useChats() {
  const [chats, setChats] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const unsubRef = useRef<null | (() => void)>(null)
  const mountedRef = useRef(true)

  /** Setter z filtracją – nie renderuj, jeśli realnie nic się nie zmieniło. */
  const safeSetChats: Dispatch<SetStateAction<ConversationSummary[]>> = useCallback((value) => {
    setChats(prev => {
      const nextRaw = typeof value === 'function'
        ? (value as (p: ConversationSummary[]) => ConversationSummary[])(prev)
        : value
      const next = sortChats(nextRaw)
      return shallowEqualChats(prev, next) ? prev : next
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchChats({ limit: 60 })
      if (!mountedRef.current) return
      const normalized = normalizeSummaries(Array.isArray(rows) ? rows : [])
      safeSetChats(normalized) // sort + shallowEqual w środku
    } catch (e: any) {
      console.error('[useChats] fetch failed', e)
      if (!mountedRef.current) return
      setError(e?.message || 'fetchChats failed')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [safeSetChats])

  useEffect(() => {
    mountedRef.current = true
    ;(async () => {
      await load()
      try { unsubRef.current?.() } catch {}
      // subskrypcja z bezpiecznym seterem + normalizacja previewów
      unsubRef.current = await subscribeChats((updater) => {
        if (typeof updater === 'function') {
          safeSetChats(prev => normalizeSummaries((updater as any)(prev)))
        } else {
          safeSetChats(normalizeSummaries(updater as any))
        }
      })
    })()

    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    const onFocus = () => load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      mountedRef.current = false
      try { unsubRef.current?.() } catch {}
      unsubRef.current = null
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [load, safeSetChats])

  /** Optymistyczna zmiana unread (np. z ChatView). */
  const setUnread = useCallback((chatId: string, unreadCount: number) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === chatId)
      if (idx === -1) return prev
      const next = [...prev]
      const curr = next[idx]
      const newCount = Math.max(0, Number(unreadCount) || 0)
      if ((curr as any).unread_count === newCount) return prev
      next[idx] = { ...curr, unread_count: newCount } as ConversationSummary
      return sortChats(next)
    })
  }, [])

  /**
   * Optymistyczny update ostatniej wiadomości (tekst + timestamp).
   * Wołaj z `ChatView.useEffect(onLastPreview)`, NIE podczas renderu.
   */
  const setLastPreview = useCallback((chatId: string, preview: string, atIso?: string) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === chatId)
      if (idx === -1) return prev
      const next = [...prev]
      const curr = next[idx] as any
      const at = atIso || new Date().toISOString()

      const currPreview = previewOfSummary(curr)
      const nextPreview = normalizePreviewLabel((preview ?? '').trim())
      const changedPreview = currPreview !== nextPreview
      const changedTime = String(toIso(curr.last_message_at ?? '')) !== String(toIso(at))

      if (!changedPreview && !changedTime) return prev

      next[idx] = {
        ...curr,
        last_message: nextPreview,
        last_message_snippet: nextPreview,
        last_message_at: at,
      }
      return sortChats(next)
    })
  }, [])

  return { chats, loading, error, refresh: load, setUnread, setLastPreview }
}
