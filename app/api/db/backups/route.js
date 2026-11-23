import { createLocalDbBackup, listLocalDbBackups } from '@/lib/server/local-db-backups';
import { assertLocalRequest, RequestNotLocalError } from '@/lib/server/request-guard';
import { assertAuthenticatedRequest, SessionAuthenticationError } from '@/lib/server/session-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function forbidden() {
  return Response.json({ ok: false, error: '허용되지 않은 요청입니다.' }, { status: 403 });
}

function unauthorized() {
  return Response.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
}

export async function GET(request) {
  try {
    assertLocalRequest(request);
    assertAuthenticatedRequest(request);
    return Response.json(listLocalDbBackups());
  } catch (error) {
    if (error instanceof RequestNotLocalError) return forbidden();
    if (error instanceof SessionAuthenticationError) return unauthorized();
    console.error('[api/db/backups] 목록 조회 실패');
    return Response.json(
      {
        ok: false,
        error: '백업 목록을 불러오지 못했습니다.',
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    assertLocalRequest(request);
    assertAuthenticatedRequest(request);
    const result = await createLocalDbBackup();
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof RequestNotLocalError) return forbidden();
    if (error instanceof SessionAuthenticationError) return unauthorized();
    console.error('[api/db/backups] 백업 생성 실패');
    return Response.json(
      {
        ok: false,
        error: '백업 생성에 실패했습니다.',
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
