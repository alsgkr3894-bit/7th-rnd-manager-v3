import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/logo-', '/manifest.json', '/api/'];
const COOKIE_NAME = 'v3:session';
const MAX_API_BODY_BYTES = 20 * 1024 * 1024;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const contentLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_API_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: '요청 데이터가 너무 큽니다. 여러 번으로 나누어 다시 시도해 주세요.' },
        { status: 413 }
      );
    }
  }

  // /login: 이미 인증된 사용자는 홈으로 리디렉트
  if (pathname.startsWith('/login')) {
    if (req.cookies.has(COOKIE_NAME)) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 나머지 공개 경로 통과
  if (PUBLIC_PATHS.slice(1).some(p => pathname.startsWith(p))) {
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
