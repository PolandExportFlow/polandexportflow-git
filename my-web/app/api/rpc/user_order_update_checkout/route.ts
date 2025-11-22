// app/api/rpc/user_order_update_checkout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const lookup: string = String(body?.lookup ?? body?.p_lookup ?? '').trim().replace(/^#/, '')
    const patch = (body?.patch ?? body?.p_patch ?? null) as Record<string, unknown> | null

    if (!lookup || !patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
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

    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('user_order_update_checkout', {
      p_lookup: lookup,
      p_patch: patch,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, updated: true, data: data ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}
