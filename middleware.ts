import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/logo-', '/api/'];
const COOKIE_NAME  = 'v3:auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로 통과
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authed = req.cookies.has(COOKIE_NAME);
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
