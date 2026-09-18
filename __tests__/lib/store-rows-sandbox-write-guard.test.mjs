/**
 * RND_SANDBOX_REJECT_WRITES=1일 때 /api/db/store-rows POST가 실제 DB에 닿기 전에
 * 403으로 거부하는지 검증한다 — 2026-09-17 샌드박스 dev 서버가 실서버 Postgres에
 * 테스트 데이터를 덮어쓴 사고 이후 추가한 이중 안전장치(브라우저 쪽은
 * lib/db/sync-mode.js NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY, 서버 쪽은 이 플래그).
 */
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

const ENV_KEY = 'RND_SANDBOX_REJECT_WRITES';

function makeRequest(body) {
  return new Request('http://localhost:3000/api/db/store-rows', {
    method: 'POST',
    headers: { host: 'localhost:3000', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/db/store-rows — 샌드박스 쓰기 거부', () => {
  const originalEnv = process.env[ENV_KEY];

  beforeEach(() => {
    delete process.env[ENV_KEY];
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnv;
  });

  test('플래그가 켜져 있으면 DB에 닿지 않고 403을 반환한다', async () => {
    process.env[ENV_KEY] = '1';
    const { POST } = await import(`@/app/api/db/store-rows/route.js?t=${Math.random()}`);

    const res = await POST(
      makeRequest({ brandId: 'main', operations: [{ type: 'upsert', storeName: 'x' }] })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.ok).toBe(false);
    expect(json.error).toContain('샌드박스');
  });
});
