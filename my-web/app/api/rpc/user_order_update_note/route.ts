import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    // akceptuj 'lookup' i 'p_lookup' (żeby nie wywracało się na starym kliencie)
    let lookup: string = String(body?.lookup ?? body?.p_lookup ?? '').trim().replace(/^#/, '')
    const note: string | null = body?.note ?? body?.p_note ?? null

    if (!lookup) {
      return NextResponse.json({ error: 'Missing lookup' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { try { cookieStore.set({ name, value, ...options }) } catch {} },
          remove(name: string, options: any) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
        },
      }
    )

    // auth must be present (ale sama funkcja i tak sprawdza auth.uid())
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // wywołanie RPC (SQL ma sygnaturę: user_order_update_note(p_lookup text, p_note text)
    const { data, error } = await supabase.rpc('user_order_update_note', {
      p_lookup: lookup,
      p_note: note,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, updated: true, data: data ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}
