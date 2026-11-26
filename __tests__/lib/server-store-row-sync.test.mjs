import { describe, expect, test } from '@jest/globals';

import {
  applyStoreRowOperations,
  normalizeStoreRowOperations,
} from '../../lib/server/store-row-sync.js';
import { LAN_EXCLUDED_STORE_NAMES } from '../../lib/server/sensitive-stores.js';

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
        upsert: async args => calls.push(['storeRow.upsert', args]),
      },
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
      'storeRow.upsert',
      'storeRow.deleteMany',
    ]);
    expect(calls[2][1].where.brandId_storeName_recordKey).toEqual({
      brandId: 'china4',
      storeName: 'cost_ingredients',
      recordKey: '7',
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
        upsert: async args => {
          const unique = args.where.brandId_storeName_recordKey;
          state.set(keyOf(unique), {
            ...args.create,
            ...args.update,
            brandId: unique.brandId,
            storeName: unique.storeName,
            recordKey: unique.recordKey,
          });
        },
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
        upsert: async args => applied.push(['upsert', args.create.recordKey]),
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
