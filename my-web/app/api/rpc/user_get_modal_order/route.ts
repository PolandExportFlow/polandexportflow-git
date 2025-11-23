// app/api/rpc/user_get_modal_order/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({} as any))

        // Akceptuj lookup (Order ID lub Order Number)
        let lookup: string = String(body?.lookup ?? body?.p_lookup ?? '').trim().replace(/^#/, '')
        if (!lookup) {
            return NextResponse.json({ error: 'Missing lookup' }, { status: 400 })
        }

        // 1. Uwierzytelnienie po stronie serwera (SSR)
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
        const { data: userData, error: userErr } = await supabase.auth.getUser()
        
        // Zwraca 401, jeśli użytkownik nie jest zalogowany
        if (userErr || !userData?.user) { 
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Wywołanie RPC do bazy danych
        // UWAGA: Funkcja SQL zawiera już filtr RLS (and user_id = v_uid)
        const { data, error } = await supabase.rpc('user_get_modal_order', { p_lookup: lookup })
        
        // Obsługa błędów SQL
        if (error) {
            return NextResponse.json(
                { error: error.message, code: (error as any).code, details: (error as any).details, hint: (error as any).hint },
                { status: 500 }
            )
        }
        
        // Obsługa braku zamówienia (gdy user_id nie pasuje do lookup)
        if (!data) { 
            // Jeśli zamówienie nie pasuje do auth.uid() w funkcji SQL, zwracamy 404/401
            return NextResponse.json({ error: 'Not found' }, { status: 404 }) 
        }

        // 3. Podpisywanie URL-i po stronie serwera (dla plików Storage)
        const bucket = supabase.storage.from('orders')
        const sign = async (path?: string | null): Promise<string | null> => {
            if (!path) return null
            const { data: signed, error: signErr } = await bucket.createSignedUrl(path, 60 * 60) // 1h
            if (signErr || !signed?.signedUrl) return null
            return signed.signedUrl
        }

        const clone = structuredClone(data);

        // a) GENERAL FILES (na statusPanel -> 'files')
        if (clone?.statusPanel?.files?.length) {
            await Promise.all(
                clone.statusPanel.files.map(async (a: any) => {
                    a.file_url = await sign(a.storage_path); 
                    return a;
                })
            )
        }

        // b) ITEM FILES (na itemsPanel -> 'files')
        if (Array.isArray(clone?.itemsPanel)) {
            for (const item of clone.itemsPanel) {
                // Klucz w funkcji SQL to 'files' - stąd pobieramy listę
                if (Array.isArray(item?.files) && item.files.length) { 
                    await Promise.all(
                        item.files.map(async (img: any) => {
                            img.file_url = await sign(img.storage_path);
                            return img;
                        })
                    );
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