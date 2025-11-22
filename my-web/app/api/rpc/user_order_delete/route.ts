import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    let lookup = String(body?.lookup ?? '').trim()
    
    // Jeśli używasz p_lookup w body, to upewnij się, że tutaj też to czytasz
    // W useStatus.ts wysyłasz { lookup }, więc body?.lookup jest OK.
    if (!lookup) {
       // Fallback jeśli frontend wysyła p_lookup
       lookup = String(body?.p_lookup ?? '').trim()
    }

    if (!lookup) {
      return NextResponse.json({ error: 'Missing lookup' }, { status: 400 })
    }

    lookup = lookup.replace(/^#/, '')

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: (n: string, v: string, o: any) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
          remove: (n: string, o: any) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
        },
      }
    )

    // --- autoryzacja użytkownika ---
    const { data: u, error: uErr } = await supabase.auth.getUser()
    if (uErr || !u?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- wywołanie RPC ---
    // 🛑 POPRAWKA: Usunięto p_user_id, bo SQL bierze to z auth.uid()
    const { data, error } = await supabase.rpc('user_order_delete', {
      p_lookup: lookup,
    })

    // --- jeśli RPC rzuciło błąd ---
    if (error) {
      const e: any = error
      const msg = String(e?.message || '').toUpperCase()

      // Znane błędy biznesowe (z funkcji)
      if (msg.includes('ORDER_NOT_DELETABLE')) {
        return NextResponse.json(
          { error: 'Order cannot be deleted. Only status "created" is allowed.' },
          { status: 400 }
        )
      }
      if (msg.includes('ORDER_NOT_FOUND')) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      if (msg.includes('FORBIDDEN')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (msg.includes('ORDER_LOOKUP_EMPTY')) {
        return NextResponse.json({ error: 'Missing lookup' }, { status: 400 })
      }
      if (msg.includes('ORDER_NOT_DELETED')) {
        return NextResponse.json(
          { error: 'Order not deleted (no rows affected).' },
          { status: 409 }
        )
      }

      // --- logika diagnostyczna ---
      return NextResponse.json(
        {
          error: 'RPC error',
          message: e?.message || null,
          details: e?.details || null,
          hint: e?.hint || null,
          code: e?.code || null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, deleted: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Server error', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}