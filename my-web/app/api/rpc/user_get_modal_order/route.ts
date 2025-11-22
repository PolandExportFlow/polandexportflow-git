// app/api/rpc/user_get_modal_order/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))

    // akceptuj lookup albo p_lookup (żeby nie wykrzaczało się jak coś jeszcze wysyła p_lookup)
    let lookup: string = String(body?.lookup ?? body?.p_lookup ?? '').trim().replace(/^#/, '')
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

    // auth
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1) Pobierz surowe dane z RPC (zwraca storage_path, NIE URL)
    const { data, error } = await supabase.rpc('user_get_modal_order', { p_lookup: lookup })
    if (error) {
      return NextResponse.json(
        { error: error.message, code: (error as any).code, details: (error as any).details, hint: (error as any).hint },
        { status: 500 }
      )
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2) Podpisywanie URL-i po stronie serwera (bucket "orders")
    const bucket = supabase.storage.from('orders')
    const sign = async (path?: string | null): Promise<string | null> => {
      if (!path) return null
      const { data: signed, error: signErr } = await bucket.createSignedUrl(path, 60 * 60) // 1h
      if (signErr || !signed?.signedUrl) return null
      return signed.signedUrl
    }

    // 3) Przejście po strukturze i podmiana file_url
    const clone = structuredClone(data)

    // a) attachments na statusPanel
    if (clone?.statusPanel?.attachments?.length) {
      await Promise.all(
        clone.statusPanel.attachments.map(async (a: any) => {
          a.file_url = await sign(a.storage_path) // tu wstawiamy podpisany URL
          return a
        })
      )
    }

    // b) item_images dla każdego itemu
    if (Array.isArray(clone?.itemsPanel)) {
      for (const item of clone.itemsPanel) {
        if (Array.isArray(item?.item_images) && item.item_images.length) {
          await Promise.all(
            item.item_images.map(async (img: any) => {
              img.file_url = await sign(img.storage_path)
              return img
            })
          )
        }
      }
    }

    return NextResponse.json(clone, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Server error', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
