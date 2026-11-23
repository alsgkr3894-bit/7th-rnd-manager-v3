import { assertLocalRequest, isLoopbackRequest, RequestNotLocalError } from '@/lib/server/request-guard';
import { readLimitedJson, RequestBodyTooLargeError } from '@/lib/server/request-body-limit';
import {
  bootstrapVerifier,
  clearSessionCookie,
  createLoginChallenge,
  issueSessionCookie,
  isSessionConfigured,
  replaceVerifier,
  SessionAuthenticationError,
  verifyLoginChallenge,
} from '@/lib/server/session-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const AUTH_BODY_LIMIT = 4096;

function json(body, status = 200, cookie = '') {
  const headers = cookie ? { 'Set-Cookie': cookie } : undefined;
  return Response.json(body, { status, headers });
}

export async function GET(request) {
  try {
    assertLocalRequest(request);
    return json({ ok: true, ...createLoginChallenge() });
  } catch {
    return json({ ok: false, error: '허용되지 않은 요청입니다.' }, 403);
  }
}

export async function POST(request) {
  try {
    assertLocalRequest(request);
    const body = await readLimitedJson(request, AUTH_BODY_LIMIT);
    if (!isSessionConfigured()) {
      if (!isLoopbackRequest(request)) {
        return json({ ok: false, error: '운영 PC에서 서버 인증을 먼저 설정해 주세요.' }, 409);
      }
      bootstrapVerifier(body.verifier);
    } else if (!verifyLoginChallenge(body)) {
      throw new SessionAuthenticationError('비밀번호가 올바르지 않습니다.');
    }
    const secure = new URL(request.url).protocol === 'https:';
    return json({ ok: true }, 200, issueSessionCookie({ remember: body.remember, secure }));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return json({ ok: false, error: '잘못된 요청입니다.' }, 413);
    if (error instanceof RequestNotLocalError) return json({ ok: false, error: '허용되지 않은 요청입니다.' }, 403);
    return json({ ok: false, error: '로그인에 실패했습니다.' }, 401);
  }
}

export async function PUT(request) {
  try {
    assertLocalRequest(request);
    const body = await readLimitedJson(request, AUTH_BODY_LIMIT);
    replaceVerifier(request, body.verifier);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: '인증 설정을 변경하지 못했습니다.' }, 401);
  }
}

export async function DELETE(request) {
  return json({ ok: true }, 200, clearSessionCookie());
}
