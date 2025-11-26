import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const lookup: string = String(body?.p_lookup ?? body?.lookup ?? '')
      .trim()
      .replace(/^#/, '')
    const patch = (body?.p_patch ?? body?.patch ?? {}) as Record<string, unknown>

    if (!lookup) {
      return NextResponse.json({ error: 'Bad payload: Missing lookup' }, { status: 400 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
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

    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))

    const { data, error } = await supabase.rpc('user_order_item_add', {
      p_lookup: lookup,
      p_patch: cleanPatch,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(data ?? { ok: true })

  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}