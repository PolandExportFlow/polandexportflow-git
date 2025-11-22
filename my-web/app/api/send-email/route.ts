// app/api/chat/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type InAttachment = { path: string; name: string; mime?: string }
type Body = {
  chat_id: string
  to?: string
  subject?: string
  text?: string
  html?: string
  attachments?: InAttachment[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // tylko na serwerze
const RESEND_API_KEY = process.env.RESEND_API_KEY!
const STORAGE_BUCKET = 'message_uploads'

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Body
    if (!payload?.chat_id) return NextResponse.json({ error: 'chat_id required' }, { status: 400 })

    // 1) Klient "user" z tokenem z requestu -> RLS + właściciel/admin
    const authHeader = req.headers.get('authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: me } = await userClient.auth.getUser()
    if (!me?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2) Sprawdź dostęp do czatu (owner/admin) i weź fallback email
    const { data: chat, error: chatErr } = await userClient
      .from('chats')
      .select('id,user_id,contact_email')
      .eq('id', payload.chat_id)
      .maybeSingle()

    if (chatErr) return NextResponse.json({ error: 'chat_query_failed', details: chatErr }, { status: 500 })
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

    const { data: urow } = await userClient.from('users').select('is_admin').eq('id', me.user.id).maybeSingle()
    const isAdmin = !!urow?.is_admin
    if (!(isAdmin || chat.user_id === me.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3) Odbiorca: to z payload albo contact_email z czatu
    const to = payload.to ?? chat.contact_email
    if (!to) return NextResponse.json({ error: 'Recipient missing' }, { status: 400 })

    // 4) Serwisowy klient (Storage download + inserty bez RLS blokad)
    const srv = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 5) Pobierz załączniki z Storage i zakoduj base64
    const emailAttachments =
      (await Promise.all(
        (payload.attachments ?? []).map(async (a) => {
          const { data, error } = await srv.storage.from(STORAGE_BUCKET).download(a.path)
          if (error) throw error
          const buf = Buffer.from(await data.arrayBuffer())
          return {
            filename: a.name,
            content: buf.toString('base64'),
            contentType: a.mime || 'application/octet-stream',
          }
        })
      )) || []

    // 6) Wyślij e-mail przez Resend
    const from = 'PolandExportFlow <support@polandexportflow.com>'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: payload.subject || 'Wiadomość od PolandExportFlow',
        text: payload.text || undefined,
        html: payload.html || (payload.text ? `<p>${payload.text.replace(/\n/g, '<br/>')}</p>` : '<p></p>'),
        attachments: emailAttachments.length ? emailAttachments : undefined,
      }),
    })
    const j = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: 'send_failed', details: j }, { status: 502 })
    }
    const provider_id = j?.id ?? null

    // 7) Zapisz wiadomość OUT w messages (+ meta)
    const { data: msg, error: insErr } = await srv
      .from('messages')
      .insert({
        chat_id: payload.chat_id,
        sender_role: 'user',
        content: payload.text ?? payload.html ?? '',
        is_read: true,
        read_at: new Date().toISOString(),
        meta: {
          transport: 'email',
          to,
          subject: payload.subject || null,
          provider: 'resend',
          provider_id,
          status: 'sent',
        },
      })
      .select('id')
      .single()

    if (insErr) {
      return NextResponse.json({ error: 'db_insert_failed', details: insErr }, { status: 500 })
    }

    // 8) (opcjonalnie) dopisz relacje załączników do messages
    if (payload.attachments?.length) {
      await srv.from('message_attachments').insert(
        payload.attachments.map((a) => ({
          message_id: msg.id,
          file_name: a.name,
          file_url: `storage://message_uploads/${a.path}`,
          mime_type: a.mime || 'application/octet-stream',
          file_path: a.path,
        }))
      )
    }

    return NextResponse.json({ ok: true, message_id: msg.id, provider_id }, { status: 200 })
  } catch (e: any) {
    console.error('send-email fatal', e)
    return NextResponse.json({ error: 'fatal' }, { status: 500 })
  }
}
