import {
  SettingsValidationError,
  readBrowserSettings,
  writeBrowserSettings,
} from '@/lib/server/browser-settings';
import { getPrismaClient } from '@/lib/server/prisma';
import { assertLocalRequest, RequestNotLocalError } from '@/lib/server/request-guard';
import { readLimitedJson, RequestBodyTooLargeError } from '@/lib/server/request-body-limit';
import { assertAuthenticatedRequest, SessionAuthenticationError } from '@/lib/server/session-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 값 하나의 최대 길이(약 1백만 자)가 여러 바이트로 늘어나도 받을 수 있는 크기
const SETTINGS_BODY_LIMIT = 8 * 1024 * 1024;
const fail = (error, status) => Response.json({ ok: false, error }, { status });

function failureOf(error, action) {
  if (error instanceof RequestNotLocalError) return fail('허용되지 않은 요청입니다.', 403);
  if (error instanceof SessionAuthenticationError) return fail('로그인이 필요합니다.', 401);
  if (error instanceof RequestBodyTooLargeError) return fail('설정 데이터가 너무 큽니다.', 413);
  if (error instanceof SettingsValidationError || error?.name === 'SyntaxError') {
    return fail('설정 요청이 올바르지 않습니다.', 400);
  }
  console.error(`[api/db/settings] ${action} 실패`);
  return fail(`설정 ${action}에 실패했습니다.`, 503);
}

export async function GET(request) {
  try {
    assertLocalRequest(request);
    assertAuthenticatedRequest(request);
    return Response.json({ ok: true, values: await readBrowserSettings(getPrismaClient()) });
  } catch (error) {
    return failureOf(error, '조회');
  }
}

export async function POST(request) {
  try {
    assertLocalRequest(request);
    assertAuthenticatedRequest(request);
    // 검증용 샌드박스 서버는 쓰기를 받지 않는다 (store-rows와 같은 안전장치)
    if (process.env.RND_SANDBOX_REJECT_WRITES === '1') {
      return fail('샌드박스 서버는 쓰기를 받지 않습니다.', 403);
    }
    const payload = await readLimitedJson(request, SETTINGS_BODY_LIMIT);
    return Response.json(await writeBrowserSettings(getPrismaClient(), payload));
  } catch (error) {
    return failureOf(error, '저장');
  }
}
