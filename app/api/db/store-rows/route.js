import { applyStoreRowOperations } from '@/lib/server/store-row-sync';
import {
  normalizeStoreRowQuery,
  readStoreRowManifest,
  readStoreRowPage,
} from '@/lib/server/store-row-read';
import { getPrismaClient } from '@/lib/server/prisma';
import { assertLocalRequest, RequestNotLocalError } from '@/lib/server/request-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 저장된 store_rows 를 브라우저로 내려준다.
 * - `?manifest=1&brandId=…` → 스토어별 행 수/분기행 수 요약
 * - `?brandId=…&storeName=…&after=…` → recordKey 커서 기반 한 페이지
 */
export async function GET(request) {
  try {
    assertLocalRequest(request);
    const { searchParams } = new URL(request.url);

    if (searchParams.get('manifest') === '1') {
      const manifest = await readStoreRowManifest(getPrismaClient(), {
        brandId: searchParams.get('brandId'),
      });
      return Response.json(manifest);
    }

    const page = await readStoreRowPage(getPrismaClient(), normalizeStoreRowQuery(searchParams));
    return Response.json(page);
  } catch (error) {
    if (error instanceof RequestNotLocalError) {
      return Response.json({ ok: false, error: '허용되지 않은 요청입니다.' }, { status: 403 });
    }
    console.error('[api/db/store-rows] 조회 실패:', error);
    return Response.json(
      {
        ok: false,
        error: '스토어 데이터 조회에 실패했습니다.',
        checkedAt: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}

// 샌드박스(scripts/dev-sandbox.mjs)에서 RND_SANDBOX_REJECT_WRITES=1로 켠다. 브라우저 쪽
// 읽기전용 강제(lib/db/sync-mode.js NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY)를 우회해도
// (예: localStorage override, 다른 클라이언트) 서버가 한 번 더 거부하는 이중 안전장치 —
// 2026-09-17 샌드박스 브라우저가 실서버 Postgres에 테스트 데이터를 덮어쓴 사고 이후 추가.
function isSandboxWriteRejected() {
  return process.env.RND_SANDBOX_REJECT_WRITES === '1';
}

export async function POST(request) {
  try {
    assertLocalRequest(request);
    if (isSandboxWriteRejected()) {
      return Response.json(
        { ok: false, error: '샌드박스 서버는 쓰기를 받지 않습니다.' },
        { status: 403 }
      );
    }
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
