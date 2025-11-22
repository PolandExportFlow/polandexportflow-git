// utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

export function createServerSupabase(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error('Missing SUPABASE envs');

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });
}
