import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get('adminToken')?.value;

  // Any non-admin route → send to admin login
  if (!pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const isAdminLogin = pathname === '/admin/login';

  if (isAdminLogin) {
    if (adminToken) return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    return NextResponse.next();
  }

  if (!adminToken) return NextResponse.redirect(new URL('/admin/login', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
