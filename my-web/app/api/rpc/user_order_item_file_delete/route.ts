import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

// Tutaj też warto to mieć, bo item_id w bazie to UUID
const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    
    const lookup = String(body?.p_lookup ?? '').trim().replace(/^#/, '')
    const item_id = String(body?.p_item_id ?? '').trim()
    const file_ids = Array.isArray(body?.p_file_ids) ? body.p_file_ids : []

    if (!lookup || !item_id || file_ids.length === 0) {
      return NextResponse.json({ error: 'Bad payload: missing lookup, item_id or file_ids' }, { status: 400 })
    }

    // Zabezpieczenie
    if (!isUUID(item_id)) {
       return NextResponse.json({ error: 'Bad payload: item_id must be UUID' }, { status: 400 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
          remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
        },
      }
    )

    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('user_order_item_file_delete', {
      p_lookup: lookup,
      p_item_id: item_id,
      p_file_ids: file_ids 
    })

    if (error) {
      console.error('RPC Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data ?? { ok: true })

  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}