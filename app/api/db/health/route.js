import { readDbHealth } from '@/lib/server/db-health';
import { getPrismaClient } from '@/lib/server/prisma';
import { assertLocalRequest, RequestNotLocalError } from '@/lib/server/request-guard';
import { assertAuthenticatedRequest, SessionAuthenticationError } from '@/lib/server/session-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    assertLocalRequest(request);
    assertAuthenticatedRequest(request);
    const health = await readDbHealth(getPrismaClient());
    return Response.json(health);
  } catch (error) {
    if (error instanceof RequestNotLocalError) {
      return Response.json({ ok: false, error: '허용되지 않은 요청입니다.' }, { status: 403 });
    }
    if (error instanceof SessionAuthenticationError) {
      return Response.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }
    console.error('[api/db/health] 상태 조회 실패');
    return Response.json(
      {
        ok: false,
        error: 'DB 상태 확인에 실패했습니다.',
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
