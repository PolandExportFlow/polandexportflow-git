import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    
    const fileId = String(body?.p_file_id ?? '').trim()

    if (!fileId) {
        return NextResponse.json({ error: 'Missing p_file_id' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: {
          get: n => cookieStore.get(n)?.value,
          set: (n,v,o) => { try { cookieStore.set({ name:n, value:v, ...o }) } catch {} },
          remove: (n,o) => { try { cookieStore.set({ name:n, value:'', ...o }) } catch {} },
        } }
    )

    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.rpc('user_order_file_delete', {
      p_file_id: fileId,
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? { deleted: true })

  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
  }
}