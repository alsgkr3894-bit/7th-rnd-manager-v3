import { describe, expect, test } from '@jest/globals';

import {
  applyStoreRowOperations,
  normalizeStoreRowOperations,
} from '../../lib/server/store-row-sync.js';
import { LAN_EXCLUDED_STORE_NAMES } from '../../lib/server/sensitive-stores.js';

// 한 INSERT에 묶인 행을 다시 꺼낸다(행마다 값 9개, 시각은 SQL에 직접 들어간다)
const insertedRows = sql => {
  const rows = [];
  for (let i = 0; i < sql.values.length; i += 9) {
    const [, brandId, storeName, scope, recordKey, legacyNumericId, json, dataHash, source] =
      sql.values.slice(i, i + 9);
    const data = JSON.parse(json);
    rows.push({ brandId, storeName, scope, recordKey, legacyNumericId, data, dataHash });
    rows.at(-1).sourceBackupId = source;
  }
  return rows;
};

describe('server store row sync', () => {
  test('normalizes shared stores into the main brand', () => {
    const [operation] = normalizeStoreRowOperations({
      operations: [
        {
          type: 'upsert',
          brandId: 'china4',
          storeName: 'sample_records',
          recordKey: '10',
          data: { id: 10, title: 'sample' },
        },
      ],
    });

    expect(operation).toMatchObject({
      brandId: 'main',
      scope: 'SHARED',
      legacyNumericId: 10,
    });
    expect(operation.dataHash).toHaveLength(64);
  });

  test('applies clear, upsert, and delete operations in one transaction', async () => {
    const calls = [];
    const tx = {
      brand: {
        upsert: async args => calls.push(['brand.upsert', args]),
      },
      storeRow: {
        findUnique: async args => {
          calls.push(['storeRow.findUnique', args]);
          return null;
        },
        deleteMany: async args => calls.push(['storeRow.deleteMany', args]),
      },
      $executeRaw: async sql => calls.push(['insert', sql]),
    };
    const prisma = {
      $transaction: async work => work(tx),
    };

    const result = await applyStoreRowOperations(prisma, {
      brandId: 'china4',
      operations: [
        { type: 'clear', storeName: 'cost_ingredients' },
        {
          type: 'upsert',
          storeName: 'cost_ingredients',
          recordKey: '7',
          data: { id: 7, ingredientName: 'Cheese' },
        },
        { type: 'delete', storeName: 'cost_ingredients', recordKey: '6' },
      ],
    });

    expect(result).toMatchObject({ ok: true, applied: 3, upserted: 1, deleted: 1, cleared: 1 });
    expect(calls.map(([name]) => name)).toEqual([
      'brand.upsert',
      'storeRow.deleteMany',
      'insert',
      'storeRow.deleteMany',
    ]);
    expect(insertedRows(calls[2][1])).toEqual([
      expect.objectContaining({
        brandId: 'china4',
        storeName: 'cost_ingredients',
        scope: 'BRAND',
        recordKey: '7',
        legacyNumericId: 7,
        data: { id: 7, ingredientName: 'Cheese' },
        sourceBackupId: null,
      }),
    ]);
    expect(calls[2][1].text).toContain('ON CONFLICT ("brand_id", "store_name", "record_key")');
    expect(calls[3][1].where).toEqual({
      brandId: 'china4',
      storeName: 'cost_ingredients',
      recordKey: { in: ['6'] },
    });
  });

  test('does not overwrite an unknown-origin row when a browser id collides', async () => {
    const state = new Map();
    const keyOf = ({ brandId, storeName, recordKey }) => `${brandId}:${storeName}:${recordKey}`;
    state.set('main:sample_records:1', {
      brandId: 'main',
      storeName: 'sample_records',
      recordKey: '1',
      sourceBackupId: null,
      dataHash: 'old-hash',
      data: { id: 1, title: 'Original note' },
    });

    const tx = {
      brand: {
        upsert: async () => {},
      },
      storeRow: {
        findUnique: async args => {
          const unique = args.where.brandId_storeName_recordKey;
          const row = state.get(keyOf(unique));
          if (!row) return null;
          return {
            dataHash: row.dataHash,
            sourceBackupId: row.sourceBackupId,
          };
        },
        deleteMany: async () => {},
      },
      $executeRaw: async sql => {
        for (const row of insertedRows(sql)) state.set(keyOf(row), row);
      },
    };
    const prisma = {
      $transaction: async work => work(tx),
    };

    await applyStoreRowOperations(prisma, {
      operations: [
        {
          type: 'upsert',
          clientId: 'browser:fresh-profile',
          brandId: 'china4',
          storeName: 'sample_records',
          recordKey: '1',
          data: { id: 1, title: 'Fresh browser note' },
        },
      ],
    });

    expect(state.get('main:sample_records:1').data.title).toBe('Original note');
    const collisionRows = Array.from(state.values()).filter(
      row => row.data?.title === 'Fresh browser note'
    );
    expect(collisionRows).toHaveLength(1);
    expect(collisionRows[0].recordKey).toContain('__client:');
    expect(collisionRows[0].sourceBackupId).toBe('client:browser:fresh-profile');
  });
});

// 이 API에는 인증이 없다. 평문 비밀번호가 든 store가 쓰기(upsert/delete/clear)로도
// 생성·수정·삭제되면 안 된다 — 읽기 차단(server-store-row-read.test.mjs)과 짝을 이룬다.
describe('민감 store 쓰기 차단', () => {
  test('로그인정보·법인카드는 upsert를 거부한다', () => {
    for (const storeName of LAN_EXCLUDED_STORE_NAMES) {
      expect(() =>
        normalizeStoreRowOperations({
          operations: [
            {
              type: 'upsert',
              storeName,
              recordKey: '1',
              data: { id: 1 },
            },
          ],
        })
      ).toThrow(/Unknown storeName/);
    }
  });

  test('로그인정보·법인카드는 clear를 거부한다', () => {
    for (const storeName of LAN_EXCLUDED_STORE_NAMES) {
      expect(() =>
        normalizeStoreRowOperations({
          operations: [{ type: 'clear', storeName }],
        })
      ).toThrow(/Unknown storeName/);
    }
  });

  test('일반 store는 계속 정상 처리된다(과도한 차단 방지)', () => {
    const [operation] = normalizeStoreRowOperations({
      operations: [
        {
          type: 'upsert',
          storeName: 'cost_ingredients',
          recordKey: '1',
          data: { id: 1, name: 'test' },
        },
      ],
    });
    expect(operation.storeName).toBe('cost_ingredients');
  });
});

describe('같은 작업을 다시 받아도 한 번만 적용한다', () => {
  function fakePrisma() {
    const ledger = new Set();
    const applied = [];
    let prunes = 0;
    const tx = {
      brand: { upsert: async () => {} },
      storeRow: {
        findUnique: async () => null,
        deleteMany: async args => applied.push(['delete', args.where.recordKey ?? '*']),
      },
      $executeRaw: async sql => {
        for (const row of insertedRows(sql)) applied.push(['upsert', row.recordKey]);
      },
      serverSetting: {
        createManyAndReturn: async ({ data, skipDuplicates }) => {
          expect(skipDuplicates).toBe(true);
          return data.filter(row => !ledger.has(row.key) && ledger.add(row.key));
        },
        deleteMany: async ({ where }) => {
          expect(where.category).toBe('sync-op');
          prunes += 1;
        },
      },
    };
    return {
      prisma: { $transaction: async work => work(tx) },
      applied,
      prunes: () => prunes,
    };
  }

  const upsert = (opId, recordKey) => ({
    type: 'upsert',
    opId,
    storeName: 'cost_ingredients',
    recordKey,
    data: { id: Number(recordKey) },
  });

  test('응답을 못 받아 다시 보낸 묶음은 적용하지 않는다', async () => {
    const server = fakePrisma();
    const payload = {
      operations: [{ type: 'clear', opId: 'a', storeName: 'cost_ingredients' }, upsert('b', '1')],
    };

    const first = await applyStoreRowOperations(server.prisma, payload);
    const again = await applyStoreRowOperations(server.prisma, payload);

    expect(first).toMatchObject({ applied: 2, duplicates: 0, cleared: 1, upserted: 1 });
    expect(again).toMatchObject({ applied: 0, duplicates: 2, cleared: 0, upserted: 0 });
    expect(server.applied).toEqual([
      ['delete', '*'],
      ['upsert', '1'],
    ]);
    expect(server.prunes()).toBeLessThanOrEqual(1);
  });

  test('일부만 새 작업이면 새 작업만, ID가 없는 작업은 항상 적용한다', async () => {
    const server = fakePrisma();
    await applyStoreRowOperations(server.prisma, { operations: [upsert('a', '1')] });

    const result = await applyStoreRowOperations(server.prisma, {
      operations: [upsert('a', '1'), upsert('b', '2'), upsert('b', '2'), upsert(undefined, '3')],
    });

    expect(result).toMatchObject({ applied: 2, duplicates: 2 });
    expect(server.applied.map(entry => entry[1])).toEqual(['1', '2', '3']);
  });

  test('너무 긴 작업 ID는 거절한다', () => {
    expect(() =>
      normalizeStoreRowOperations({ operations: [upsert('x'.repeat(81), '1')] })
    ).toThrow('Invalid opId.');
  });
});

describe('묶어서 적용 — 순서와 결과는 하나씩 적용할 때와 같다', () => {
  function recorder() {
    const log = [];
    let options;
    const tx = {
      brand: { upsert: async () => {} },
      storeRow: {
        findUnique: async () => null,
        deleteMany: async ({ where }) =>
          log.push(['delete', where.storeName, where.recordKey?.in ?? '*']),
      },
      $executeRaw: async sql => log.push(['insert', insertedRows(sql)]),
    };
    const prisma = {
      $transaction: async (work, given) => {
        options = given;
        return work(tx);
      },
    };
    return { prisma, log, options: () => options };
  }
  const put = (recordKey, name = 'x', storeName = 'cost_ingredients') => ({
    type: 'upsert',
    storeName,
    recordKey: String(recordKey),
    data: { id: recordKey, name },
  });
  const del = (recordKey, storeName = 'cost_ingredients') => ({
    type: 'delete',
    storeName,
    recordKey: String(recordKey),
  });

  test('이어지는 저장은 100행씩 한 번에, 중간의 삭제·비우기는 제자리에서 실행한다', async () => {
    const server = recorder();
    const operations = [
      ...Array.from({ length: 150 }, (_, i) => put(i + 1)),
      del(1),
      del(2),
      del(3, 'menu_master'),
      { type: 'clear', storeName: 'price_rows' },
      put(9, 'y', 'price_rows'),
      put(4, 'z', 'menu_master'),
    ];

    const result = await applyStoreRowOperations(server.prisma, { operations });

    expect(
      server.log.map(([kind, a, b]) => (kind === 'insert' ? [kind, a.length] : [kind, a, b]))
    ).toEqual([
      ['insert', 100],
      ['insert', 50],
      ['delete', 'cost_ingredients', ['1', '2']],
      ['delete', 'menu_master', ['3']],
      ['delete', 'price_rows', '*'],
      ['insert', 2],
    ]);
    expect(result).toMatchObject({ applied: 156, upserted: 152, deleted: 3, cleared: 1 });
    expect(server.options()).toEqual({ maxWait: 10_000, timeout: 30_000 });
  });

  test('같은 행을 여러 번 저장하면 마지막 값만 넣는다', async () => {
    const server = recorder();
    await applyStoreRowOperations(server.prisma, {
      operations: [put(1, '처음'), put(2, '둘'), put(1, '마지막')],
    });

    expect(server.log).toHaveLength(1);
    expect(server.log[0][1].map(row => row.data.name)).toEqual(['마지막', '둘']);
  });

  test('삭제 뒤의 같은 행 저장은 삭제보다 나중에 실행한다', async () => {
    const server = recorder();
    await applyStoreRowOperations(server.prisma, {
      operations: [put(1, '옛'), del(1), put(1, '새')],
    });

    expect(server.log.map(entry => entry[0])).toEqual(['insert', 'delete', 'insert']);
    expect(server.log[2][1][0].data.name).toBe('새');
  });

  test('큰 행은 글자 수 상한에서 나눈다', async () => {
    const server = recorder();
    const photo = 'a'.repeat(3 * 1024 * 1024);
    await applyStoreRowOperations(server.prisma, {
      operations: [1, 2, 3, 4, 5].map(id => put(id, photo)),
    });

    expect(server.log.map(entry => entry[1].length)).toEqual([2, 2, 1]);
  });
});
