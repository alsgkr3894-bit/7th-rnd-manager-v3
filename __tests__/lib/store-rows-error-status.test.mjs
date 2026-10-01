/**
 * POST /api/db/store-rows 오류 응답 구분.
 * 전엔 DB 다운·연결 실패까지 400으로 답해 클라이언트(lib/db/server-sync.js)가 '영구 거절'로 보고
 * 그 저장을 재시도 없이 버렸다(2026-09-30 점검). 요청이 잘못된 경우만 400, 서버 쪽 일시 오류는 503.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('@/lib/server/prisma', () => ({
  getPrismaClient: () => ({
    // Postgres가 내려간 상황 — 트랜잭션을 시작하자마자 연결 오류
    $transaction: async () => {
      throw new Error("Can't reach database server at `localhost:5432`");
    },
  }),
}));

const request = body =>
  new Request('http://localhost:3000/api/db/store-rows', {
    method: 'POST',
    headers: { host: 'localhost:3000', 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/db/store-rows 상태 코드', () => {
  const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterEach(() => quiet.mockClear());

  test('DB 연결 실패는 503 — 클라이언트가 큐에 남겨 재시도한다', async () => {
    const { POST } = await import('@/app/api/db/store-rows/route.js');
    const res = await POST(
      request({
        brandId: 'main',
        operations: [{ type: 'upsert', storeName: 'menu_master', recordKey: '1', data: { id: 1 } }],
      })
    );
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });

  test('알 수 없는 store 같은 잘못된 요청은 400', async () => {
    const { POST } = await import('@/app/api/db/store-rows/route.js');
    const res = await POST(
      request({
        brandId: 'main',
        operations: [{ type: 'upsert', storeName: 'nope', recordKey: '1', data: {} }],
      })
    );
    expect(res.status).toBe(400);
  });

  test('깨진 JSON도 400', async () => {
    const { POST } = await import('@/app/api/db/store-rows/route.js');
    const res = await POST(request('{ not json'));
    expect(res.status).toBe(400);
  });

  test('클라이언트는 5xx를 영구 거절로 보지 않는다(4xx만 격리)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../lib/db/server-sync.js', import.meta.url), 'utf8');
    expect(src).toContain('status >= 400 && status < 500');
  });
});
