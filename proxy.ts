import { NextRequest, NextResponse } from 'next/server';
import { inspectSessionToken } from '@/lib/server/session-auth';

const PUBLIC_PATHS = ['/_next', '/favicon.ico', '/logo-', '/manifest.json', '/api/'];
const COOKIE_NAME = 'v3:session';
const MAX_API_BODY_BYTES = 20 * 1024 * 1024;

// 쿠키가 있는지가 아니라 서명·만료·세션 버전까지 확인한다
function sessionOf(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token === undefined ? 'missing' : inspectSessionToken(token);
}

function dropInvalidCookie(res: NextResponse, session: string) {
  if (session === 'invalid') res.cookies.delete(COOKIE_NAME);
  return res;
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export function proxy(req: NextRequest) {
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

  // API는 각 라우트가 세션을 검증한다
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const session = sessionOf(req);

  if (pathname.startsWith('/login')) {
    if (session === 'valid') return redirectTo(req, '/');
    return dropInvalidCookie(NextResponse.next(), session);
  }

  if (session !== 'valid') return dropInvalidCookie(redirectTo(req, '/login'), session);

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
