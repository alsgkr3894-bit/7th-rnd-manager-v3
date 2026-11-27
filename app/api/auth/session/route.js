import {
  assertLocalRequest,
  isLoopbackRequest,
  RequestNotLocalError,
} from '@/lib/server/request-guard';
import { readLimitedJson, RequestBodyTooLargeError } from '@/lib/server/request-body-limit';
import {
  AuthStateError,
  bootstrapPassword,
  changePassword,
  clearSessionCookie,
  createLoginChallenge,
  issueSessionCookie,
  isSessionConfigured,
  LoginFailedError,
  LoginLockedError,
  PasswordPolicyError,
  revokeAllSessions,
  SessionAuthenticationError,
  verifyLoginChallenge,
} from '@/lib/server/session-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const AUTH_BODY_LIMIT = 4096;

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers });
}

function withCookie(cookie) {
  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
}

function fail(error, status, headers) {
  return json({ ok: false, error }, status, headers);
}

function isSecure(request) {
  return new URL(request.url).protocol === 'https:';
}

/** 원인을 알려 줘도 되는 오류만 문장을 그대로 보낸다 — 나머지는 fallback. */
function errorResponse(error, fallback, fallbackStatus = 401) {
  if (error instanceof RequestBodyTooLargeError) return fail('잘못된 요청입니다.', 413);
  if (error instanceof RequestNotLocalError) return fail('허용되지 않은 요청입니다.', 403);
  if (error instanceof LoginLockedError) {
    return fail(error.message, 429, { 'Retry-After': String(error.retryAfterSeconds) });
  }
  if (error instanceof LoginFailedError) return fail(error.message, 401);
  if (error instanceof PasswordPolicyError) return fail(error.message, 400);
  if (error instanceof SessionAuthenticationError) return fail(error.message, 401);
  if (error instanceof AuthStateError) return fail(error.message, 500);
  return fail(fallback, fallbackStatus);
}

export async function GET(request) {
  try {
    assertLocalRequest(request);
    return json({ ok: true, ...createLoginChallenge() });
  } catch (error) {
    return errorResponse(error, '로그인 상태를 확인하지 못했습니다.', 500);
  }
}

export async function POST(request) {
  try {
    assertLocalRequest(request);
    const body = await readLimitedJson(request, AUTH_BODY_LIMIT);
    if (!isSessionConfigured()) {
      if (!isLoopbackRequest(request)) {
        return fail('운영 PC에서 서버 인증을 먼저 설정해 주세요.', 409);
      }
      bootstrapPassword(body);
    } else {
      verifyLoginChallenge(body);
    }
    return withCookie(issueSessionCookie({ remember: body.remember, secure: isSecure(request) }));
  } catch (error) {
    return errorResponse(error, '로그인에 실패했습니다.');
  }
}

export async function PUT(request) {
  try {
    assertLocalRequest(request);
    // 새 비밀번호 원문이 실려 오므로 HTTPS 없이는 운영 PC에서만 받는다
    if (!isLoopbackRequest(request) && !isSecure(request)) {
      return fail('비밀번호 변경은 운영 PC에서만 할 수 있습니다.', 403);
    }
    const body = await readLimitedJson(request, AUTH_BODY_LIMIT);
    const { remember } = changePassword(request, body);
    // 이전 세션은 모두 무효가 됐으므로 지금 쓰는 브라우저에는 새로 발급한다
    return withCookie(issueSessionCookie({ remember, secure: isSecure(request) }));
  } catch (error) {
    // 로그인은 돼 있는 상태에서 현재 비밀번호만 틀린 것은 401(로그인 필요)과 구분한다
    if (error instanceof LoginFailedError) return fail(error.message, 403);
    return errorResponse(error, '인증 설정을 변경하지 못했습니다.');
  }
}

export async function DELETE(request) {
  try {
    assertLocalRequest(request);
    if (new URL(request.url).searchParams.get('all') === '1') revokeAllSessions(request);
    return withCookie(clearSessionCookie({ secure: isSecure(request) }));
  } catch (error) {
    return errorResponse(error, '로그아웃하지 못했습니다.');
  }
}
