// app/admin/components/sections/messages/fetchers/chats/fetchChats.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import type { ConversationSummary } from '../../msgTypes'
import { toIso } from '../utils'

export type FetchChatsOpts = {
  limit?: number
  beforeAt?: string | null
  beforeId?: string | null
  ownerId?: string | null
  onlyMine?: boolean
  search?: string
}

/* ==== helpers ==== */
function asCustomerType(v: any): ConversationSummary['customer_type'] {
  if (v === 'b2c' || v === 'b2b') return v
  const s = String(v ?? '').toLowerCase()
  return s === 'b2c' || s === 'b2b' ? (s as 'b2c' | 'b2b') : undefined
}

type LMAItem = NonNullable<ConversationSummary['last_message_attachments']>[number]

function toAttachments(raw: any): LMAItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((a: any) => ({
      file_url: String(a?.file_url ?? a?.url ?? ''),
      file_name: String(a?.file_name ?? a?.name ?? ''),
      ...(a?.mime_type ? { mime_type: String(a.mime_type) } : {}),
    })) as LMAItem[]
  }
  const n = Number.isFinite(raw) ? Math.max(0, Number(raw)) : 0
  return Array.from({ length: n }, () => ({ file_url: '', file_name: '' })) as LMAItem[]
}

/** Jeden spójny „preview” dla last_message i last_message_snippet. */
function computePreview(row: any): string {
  const txt = String(row.last_message ?? row.last_message_snippet ?? '').trim()
  if (txt) return txt
  const hasAtt =
    (Array.isArray(row.last_message_attachments) && row.last_message_attachments.length > 0) ||
    Boolean(row.last_message_has_attachments)
  return hasAtt ? '[photo]' : ''
}

function likePattern(q: string) {
  const safe = q.replace(/[%_]/g, m => '\\' + m)
  return `%${safe}%`
}

function normalize(rows: any[]): ConversationSummary[] {
  return (rows ?? []).map((r: any): ConversationSummary => {
    const preview = computePreview(r)
    return {
      id: String(r.id ?? r.chat_id),
      contact_name: String(r.contact_name ?? r.full_name ?? r.name ?? r.email ?? 'Kontakt'),
      contact_email: r.contact_email ?? r.email ?? undefined,
      contact_phone: r.contact_phone ?? r.phone ?? undefined,
      customer_type: asCustomerType(r.customer_type ?? r.contact?.customer_type),
      last_message: preview,
      last_message_snippet: preview,
      last_message_at: toIso(r.last_message_at ?? r.last_message_created_at ?? r.created_at ?? 0),
      unread_count: Number.isFinite(r?.unread_count) ? Number(r.unread_count) : 0,
      last_message_attachments: toAttachments(r.last_message_attachments),
      priority: ((r as any).priority ?? 'normal') as ConversationSummary['priority'],
      is_new: typeof r.is_new === 'boolean' ? r.is_new : false,
      owner_id: r.owner_id ?? null,
    }
  })
}

/* ==== main ==== */
export async function fetchChats(opts: FetchChatsOpts = {}): Promise<ConversationSummary[]> {
  const {
    limit = 30,
    beforeAt = null,
    beforeId = null,
    ownerId: ownerIdArg = null,
    onlyMine = false,
    search,
  } = opts

  const pageSize = Math.max(1, Math.min(200, Number(limit) || 30))
  const fetchSize = pageSize + 1

  let ownerId = ownerIdArg
  if (!ownerId && onlyMine) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      ownerId = session?.user?.id ?? null
    } catch {
      /* ignore */
    }
  }

  // ZERO komentarzy w projekcji — PostgREST ich nie toleruje
  const selectWithPriority =
    'id,contact_name,contact_email,contact_phone,customer_type,last_message,last_message_snippet,last_message_at,unread_count,last_message_attachments,is_new,owner_id,priority'

  const selectFallback =
    'id,contact_name,contact_email,contact_phone,customer_type,last_message_snippet,last_message_at,unread_count,last_message_attachments,is_new,owner_id'

  const buildBase = (withPriority: boolean) => {
    let q = supabase
      .from('chat_list')
      .select(withPriority ? selectWithPriority : selectFallback)
      .order('last_message_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(fetchSize)

    if (ownerId) q = q.eq('owner_id', ownerId)

    if (search && search.trim()) {
      const pat = likePattern(search.trim())
      q = q.or(
        [
          `contact_name.ilike.${pat}`,
          `contact_email.ilike.${pat}`,
          `contact_phone.ilike.${pat}`,
        ].join(',')
      )
    }

    // Paginacja bez nawiasów na początku – stabilniej
    if (beforeAt && beforeId) {
      const iso = toIso(beforeAt)
      q = q.or(`last_message_at.lt.${iso},and(last_message_at.eq.${iso},id.lt.${beforeId})`)
    } else if (beforeAt) {
      q = q.lt('last_message_at', toIso(beforeAt))
    }

    return q
  }

  // 1) pełny widok
  let { data, error } = await buildBase(true)

  // 2) fallback gdy nie ma kolumn (priority/last_message)
  if (error && /(priority|last_message)/i.test(String(error.message))) {
    const res = await buildBase(false)
    data = res.data as any
    error = res.error as any
  }

  if (error) {
    logSbError('[fetchChats]', error)
    return []
  }

  const base = Array.isArray(data) ? data : []
  const slice = base.length > pageSize ? base.slice(0, pageSize) : base

  return normalize(slice)
}
