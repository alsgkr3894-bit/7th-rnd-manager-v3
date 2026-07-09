import { applyStoreRowOperations } from '@/lib/server/store-row-sync';
import { getPrismaClient } from '@/lib/server/prisma';
import { assertLocalRequest, RequestNotLocalError } from '@/lib/server/request-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    assertLocalRequest(request);
    const payload = await request.json();
    const result = await applyStoreRowOperations(getPrismaClient(), payload);
    return Response.json(result);
  } catch (error) {
    if (error instanceof RequestNotLocalError) {
      return Response.json({ ok: false, error: '허용되지 않은 요청입니다.' }, { status: 403 });
    }
    // 내부 오류 상세(DB 제약·컬럼명·경로 등)는 서버 로그에만 남기고 클라이언트에는 일반 메시지.
    console.error('[api/db/store-rows] 처리 실패:', error);
    return Response.json(
      {
        ok: false,
        error: '스토어 동기화 처리에 실패했습니다.',
        checkedAt: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}
