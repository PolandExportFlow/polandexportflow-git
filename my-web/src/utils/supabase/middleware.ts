import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from './server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dashboard only (resztę filtruje config.matcher)
  const res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerSupabase(req, res);

  const { data: { user } } = await supabase.auth.getUser();

  const isAdminPath = pathname.startsWith('/dashboard/admin');

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminPath) {
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('role, assigned_sections, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !adminUser || !adminUser.is_active) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    const section = pathname.split('/')[3] || '';
    if (section && Array.isArray(adminUser.assigned_sections) && !adminUser.assigned_sections.includes(section)) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/admin';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
