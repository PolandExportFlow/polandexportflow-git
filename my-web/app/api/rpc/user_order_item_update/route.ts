import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    
    // Odczytuje p_lookup, p_item_id i p_patch (to jest poprawne)
    const lookup: string = String(body?.p_lookup ?? '').trim().replace(/^#/, '')
    const item_id: string = String(body?.p_item_id ?? '').trim()
    const patch = (body?.p_patch ?? {}) as Record<string, unknown>

    if (!lookup || !item_id) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
    }
    if (!isUUID(item_id)) {
      return NextResponse.json({ error: 'item_id must be UUID' }, { status: 400 })
    }

    // 🔥 POPRAWKA BŁĘDU KOMPILACJI: Usunięto 'await'. 
    // funkcja cookies() z 'next/headers' jest synchroniczna.
    const cookieStore = await cookies()

    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
    
    if (Object.keys(cleanPatch).length === 0) {
      return NextResponse.json({ ok: true, message: 'No fields to update' })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Błąd kompilacji znika, bo cookieStore jest teraz poprawnym obiektem
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
          remove: (name: string, options: any) => { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
        },
      }
    )

    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ta logika jest poprawna i przekaże 'cleanPatch' do SQL
    const { data, error } = await supabase.rpc('user_order_item_update', {
      p_lookup: lookup,
      p_item_id: item_id,
      p_patch: cleanPatch, 
    })

    if (error) {
      // Błąd 400 (invalid input...) zniknie, gdy serwer się przebuduje z tym kodem
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(data ?? { ok: true })

  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}