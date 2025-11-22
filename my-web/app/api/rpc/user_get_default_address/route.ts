import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: any) { try { cookieStore.set({ name, value, ...options }) } catch { } },
                    remove(name: string, options: any) { try { cookieStore.set({ name, value: '', ...options }) } catch { } },
                },
            }
        )

        // Sprawdź, czy użytkownik jest zalogowany
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Wywołaj funkcję RPC bez żadnych argumentów
        const { data, error } = await supabase.rpc('user_get_default_address')

        // Sprawdź błąd z RPC
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Zwróć dane (czyli obiekt json z adresem)
        return NextResponse.json(data)

    } catch (e: any) {
        return NextResponse.json({ error: 'Server error', message: String(e?.message ?? e) }, { status: 500 })
    }
}