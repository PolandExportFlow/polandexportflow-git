import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    if (!body) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Pobieranie i czyszczenie danych
    const lookup = String(body.p_lookup ?? '').trim().replace(/^#/, '')
    const item_id = String(body.p_item_id ?? '').trim()
    const patch = (body.p_patch ?? {}) as Record<string, unknown>

    // Walidacja danych wejściowych
    if (!lookup || !item_id) {
      return NextResponse.json({ error: 'Bad payload: Missing lookup or item_id' }, { status: 400 })
    }
    
    if (!isUUID(item_id)) {
      return NextResponse.json({ error: 'Bad payload: item_id must be UUID' }, { status: 400 })
    }

    // Przygotowanie patcha (usuwamy undefined)
    const cleanPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined)
    )

    // Jeśli nie ma co aktualizować, zwracamy sukces od razu
    if (Object.keys(cleanPatch).length === 0) {
      return NextResponse.json({ ok: true, message: 'No fields to update' })
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

    // Wywołanie bazy
    const { data, error } = await supabase.rpc('user_order_item_update', {
      p_lookup: lookup,
      p_item_id: item_id,
      p_patch: cleanPatch,
    })

    if (error) {
      // Tutaj zwracamy błąd z SQL (np. ITEM_NOT_FOUND)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(data ?? { ok: true })

  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}