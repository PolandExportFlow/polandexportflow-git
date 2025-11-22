import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    // Sprawdzamy klucze, które są potrzebne do tworzenia połączeń (server-side)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING';

    return NextResponse.json({
        NEXT_PUBLIC_SUPABASE_URL_OK: url.startsWith('http'),
        NEXT_PUBLIC_SUPABASE_ANON_KEY_OK: key.length > 10,
        SUPABASE_URL_PREVIEW: url.substring(0, 20) + '...',
        SERVER_ENV_LOADED: !!process.env.R2_ACCESS_KEY
    });
}