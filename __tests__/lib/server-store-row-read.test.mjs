/**
 * store_rows 읽기 경로 테스트.
 * 쿼리 검증·클램프, 공유 스토어의 main 고정, 분기행 제외, 바이트 예산 절단을 확인한다.
 */
import { describe, expect, test } from '@jest/globals';

import {
  FORKED_KEY_MARKER,
  LAN_EXCLUDED_STORE_NAMES,
  normalizeStoreRowQuery,
  readStoreRowManifest,
  readStoreRowPage,
  resolveReadBrandId,
} from '../../lib/server/store-row-read.js';

function params(record) {
  return { get: key => (key in record ? String(record[key]) : null) };
}

describe('normalizeStoreRowQuery', () => {
  test('알 수 없는 storeName은 거부한다', () => {
    expect(() => normalizeStoreRowQuery(params({ storeName: 'not_a_store' }))).toThrow(
      /Unknown storeName/
    );
    expect(() => normalizeStoreRowQuery(params({}))).toThrow(/Unknown storeName/);
  });

  test('기본값을 채우고 공유 스토어는 main으로 고정한다', () => {
    const query = normalizeStoreRowQuery(
      params({ storeName: 'sample_records', brandId: 'china4' })
    );
    expect(query).toMatchObject({
      storeName: 'sample_records',
      brandId: 'main',
      after: '',
      includeForked: false,
    });
    expect(query.maxRows).toBeGreaterThan(0);
    expect(query.maxBytes).toBeGreaterThan(0);
  });

  test('브랜드 스토어는 요청한 브랜드를 유지한다', () => {
    expect(
      normalizeStoreRowQuery(params({ storeName: 'cost_ingredients', brandId: 'china4' })).brandId
    ).toBe('china4');
  });

  test('maxRows·maxBytes를 상·하한으로 클램프한다', () => {
    const high = normalizeStoreRowQuery(
      params({ storeName: 'cost_ingredients', maxRows: '99999', maxBytes: '999999999' })
    );
    expect(high.maxRows).toBeLessThanOrEqual(200);
    expect(high.maxBytes).toBeLessThanOrEqual(8 * 1024 * 1024);

    const low = normalizeStoreRowQuery(
      params({ storeName: 'cost_ingredients', maxRows: '-5', maxBytes: '1' })
    );
    expect(low.maxRows).toBeGreaterThanOrEqual(1);
    expect(low.maxBytes).toBeGreaterThanOrEqual(64 * 1024);
  });

  test('숫자가 아닌 값은 기본값으로 되돌린다', () => {
    const query = normalizeStoreRowQuery(params({ storeName: 'cost_ingredients', maxRows: 'abc' }));
    expect(Number.isInteger(query.maxRows)).toBe(true);
    expect(query.maxRows).toBeGreaterThan(0);
  });

  test('includeForked는 "1"일 때만 켜진다', () => {
    const on = normalizeStoreRowQuery(
      params({ storeName: 'cost_ingredients', includeForked: '1' })
    );
    const off = normalizeStoreRowQuery(
      params({ storeName: 'cost_ingredients', includeForked: 'true' })
    );
    expect(on.includeForked).toBe(true);
    expect(off.includeForked).toBe(false);
  });
});

// 이 API에는 인증이 없다. 평문 비밀번호가 든 store가 네트워크로 나가면 안 된다.
describe('민감 store 차단', () => {
  test('로그인정보·법인카드는 제외 목록에 있다', () => {
    expect(LAN_EXCLUDED_STORE_NAMES.has('rnd_login_credentials')).toBe(true);
    expect(LAN_EXCLUDED_STORE_NAMES.has('rnd_corporate_card_entries')).toBe(true);
  });

  test('제외 store는 페이지 조회를 거부한다', () => {
    for (const storeName of LAN_EXCLUDED_STORE_NAMES) {
      expect(() => normalizeStoreRowQuery(params({ storeName }))).toThrow(
        /not readable over the network/
      );
    }
  });

  test('제외 store는 매니페스트 집계 대상에서도 빠진다', async () => {
    const askedFor = [];
    const prisma = {
      storeRow: {
        groupBy: async args => {
          askedFor.push(...args.where.storeName.in);
          return [];
        },
      },
    };
    await readStoreRowManifest(prisma, { brandId: 'main' });

    for (const storeName of LAN_EXCLUDED_STORE_NAMES) {
      expect(askedFor).not.toContain(storeName);
    }
    // 일반 store는 정상적으로 조회 대상이어야 한다(과도한 제외 방지)
    expect(askedFor).toContain('cost_ingredients');
    expect(askedFor).toContain('menu_dev_notes');
  });
});

describe('resolveReadBrandId', () => {
  test('공유 스토어는 항상 main', () => {
    expect(resolveReadBrandId('sample_records', 'china4')).toBe('main');
  });
  test('브랜드 스토어는 지정값, 없으면 main', () => {
    expect(resolveReadBrandId('cost_ingredients', 'china4')).toBe('china4');
    expect(resolveReadBrandId('cost_ingredients', '')).toBe('main');
  });
  test('지나치게 긴 brandId는 거부한다', () => {
    expect(() => resolveReadBrandId('cost_ingredients', 'x'.repeat(200))).toThrow(
      /Invalid brandId/
    );
  });
});

describe('readStoreRowManifest', () => {
  test('총 행 수에서 분기행을 빼고, BigInt 카운트도 숫자로 변환한다', async () => {
    const calls = [];
    const prisma = {
      storeRow: {
        groupBy: async args => {
          calls.push(args);
          const forkedOnly = args.where.recordKey?.contains === FORKED_KEY_MARKER;
          const wantsShared = args.where.storeName.in.includes('sample_records');
          if (wantsShared) {
            return forkedOnly
              ? [{ storeName: 'sample_records', _count: { _all: 1 }, _max: { updatedAt: null } }]
              : [
                  {
                    storeName: 'sample_records',
                    // Prisma raw 경로에서 BigInt가 올 수 있으므로 숫자 변환을 검증한다
                    _count: { _all: 10n },
                    _max: { updatedAt: new Date('2026-07-20T00:00:00Z') },
                  },
                ];
          }
          return forkedOnly
            ? []
            : [
                {
                  storeName: 'cost_ingredients',
                  _count: { _all: 4 },
                  _max: { updatedAt: new Date('2026-07-21T00:00:00Z') },
                },
              ];
        },
      },
    };

    const manifest = await readStoreRowManifest(prisma, { brandId: 'china4' });

    const sample = manifest.stores.find(s => s.storeName === 'sample_records');
    expect(sample).toMatchObject({
      shared: true,
      brandId: 'main', // 공유 스토어는 요청 브랜드와 무관하게 main
      totalRows: 10,
      forkedRows: 1,
      rows: 9, // 실제 내려받을 수 = 총 - 분기
    });
    expect(sample.updatedAt).toBe('2026-07-20T00:00:00.000Z');

    const cost = manifest.stores.find(s => s.storeName === 'cost_ingredients');
    expect(cost).toMatchObject({ shared: false, brandId: 'china4', rows: 4, forkedRows: 0 });

    expect(manifest.totalRows).toBe(13);
    expect(manifest.totalForkedRows).toBe(1);
    // 직렬화 가능해야 한다 (BigInt가 남아 있으면 여기서 터진다)
    expect(() => JSON.stringify(manifest)).not.toThrow();
  });

  test('행이 없는 스토어는 목록에서 제외한다', async () => {
    const prisma = { storeRow: { groupBy: async () => [] } };
    const manifest = await readStoreRowManifest(prisma, {});
    expect(manifest.stores).toEqual([]);
    expect(manifest.totalRows).toBe(0);
    expect(manifest.brandId).toBe('main');
  });
});

describe('readStoreRowPage', () => {
  const baseQuery = {
    storeName: 'cost_ingredients',
    brandId: 'main',
    after: '',
    maxRows: 50,
    maxBytes: 4 * 1024 * 1024,
    includeForked: false,
  };

  test('분기행을 제외하고 recordKey 오름차순 커서로 읽는다', async () => {
    let seen = null;
    const prisma = {
      storeRow: {
        findMany: async args => {
          seen = args;
          return [
            { recordKey: '1', legacyNumericId: 1, data: { id: 1 } },
            { recordKey: '2', legacyNumericId: 2, data: { id: 2 } },
          ];
        },
      },
    };

    const page = await readStoreRowPage(prisma, { ...baseQuery, after: '0' });

    expect(seen.orderBy).toEqual({ recordKey: 'asc' });
    expect(seen.take).toBe(50);
    expect(seen.where.recordKey.gt).toBe('0');
    expect(seen.where.recordKey.not).toEqual({ contains: FORKED_KEY_MARKER });
    expect(page.nextCursor).toBe('2');
    expect(page.done).toBe(false);
    expect(page.rows).toHaveLength(2);
  });

  test('includeForked면 분기행 필터를 걸지 않는다', async () => {
    let seen = null;
    const prisma = {
      storeRow: {
        findMany: async args => {
          seen = args;
          return [];
        },
      },
    };
    await readStoreRowPage(prisma, { ...baseQuery, includeForked: true });
    expect(seen.where.recordKey).toBeUndefined();
  });

  test('바이트 예산을 넘으면 잘라내고 커서를 마지막 포함 행으로 맞춘다', async () => {
    const big = 'x'.repeat(200 * 1024);
    const prisma = {
      storeRow: {
        findMany: async () => [
          { recordKey: '1', legacyNumericId: 1, data: { blob: big } },
          { recordKey: '2', legacyNumericId: 2, data: { blob: big } },
          { recordKey: '3', legacyNumericId: 3, data: { blob: big } },
        ],
      },
    };

    const page = await readStoreRowPage(prisma, { ...baseQuery, maxBytes: 300 * 1024 });

    expect(page.rows).toHaveLength(1);
    expect(page.nextCursor).toBe('1');
    expect(page.done).toBe(false);
  });

  // 이게 깨지면 거대한 행 하나에서 커서가 영원히 멈춘다
  test('단일 행이 예산을 초과해도 첫 행은 반드시 내려보낸다', async () => {
    const huge = 'x'.repeat(2 * 1024 * 1024);
    const prisma = {
      storeRow: {
        findMany: async () => [
          { recordKey: 'a', legacyNumericId: null, data: { blob: huge } },
          { recordKey: 'b', legacyNumericId: null, data: { blob: huge } },
        ],
      },
    };

    const page = await readStoreRowPage(prisma, { ...baseQuery, maxBytes: 64 * 1024 });

    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].recordKey).toBe('a');
    expect(page.nextCursor).toBe('a');
    expect(page.done).toBe(false);
  });

  test('결과가 없으면 done', async () => {
    const prisma = { storeRow: { findMany: async () => [] } };
    const page = await readStoreRowPage(prisma, baseQuery);
    expect(page).toMatchObject({ done: true, nextCursor: null, rows: [] });
  });
});
