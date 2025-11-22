// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  // 1) odczyt parametrów
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  const errDesc = url.searchParams.get('error_description')

  // dopuszczamy ?next= lub ?redirect=
  const rawNext = url.searchParams.get('next') ?? url.searchParams.get('redirect') ?? '/dashboard'
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  // 2) błędy z providera
  if (err) {
    const q = new URLSearchParams({ error: err, ...(errDesc ? { reason: errDesc } : {}) })
    return NextResponse.redirect(`${url.origin}/login?${q.toString()}`)
  }
  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?error=no_code`)
  }

  // 3) SSR klient z hookiem na cookies
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // 4) wymiana code -> session + zapis cookies
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${url.origin}/login?error=auth_failed`)
  }

  // 5) sukces → redirect na bezpieczny next
  return NextResponse.redirect(`${url.origin}${safeNext}`)
}
