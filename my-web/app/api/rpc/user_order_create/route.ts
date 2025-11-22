// app/api/rpc/user_order_create/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}))

		const p_service = String(body?.p_service ?? '').trim()
		const p_address = body?.p_address ?? null
		const p_items = body?.p_items ?? null
		const p_order_note = (body?.p_order_note ?? null) as string | null

		if (!p_service) return NextResponse.json({ error: 'Missing p_service' }, { status: 400 })
		if (!p_address || typeof p_address !== 'object') {
			return NextResponse.json({ error: 'Invalid p_address' }, { status: 400 })
		}
		if (!Array.isArray(p_items) || p_items.length === 0) {
			return NextResponse.json({ error: 'No items in p_items' }, { status: 400 })
		}

		const cookieStore = await cookies()
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					get: (n: string) => cookieStore.get(n)?.value,
					set: (n: string, v: string, o: any) => {
						try {
							cookieStore.set({ name: n, value: v, ...o })
						} catch {}
					},
					remove: (n: string, o: any) => {
						try {
							cookieStore.set({ name: n, value: '', ...o })
						} catch {}
					},
				},
			}
		)

		const { data: auth } = await supabase.auth.getUser()
		if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const { data, error } = await supabase.rpc('user_order_create', {
			p_service,
			p_address,
			p_items,
			p_order_note,
		})

		if (error) {
			return NextResponse.json(
				{ error: error.message, code: (error as any).code, details: (error as any).details },
				{ status: 500 }
			)
		}

		if (!data) return NextResponse.json({ error: 'Empty RPC response' }, { status: 500 })
		return NextResponse.json(data, { status: 200 })
	} catch (e: any) {
		return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
	}
}
