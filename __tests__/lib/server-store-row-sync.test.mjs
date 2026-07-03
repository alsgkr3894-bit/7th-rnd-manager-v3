import { describe, expect, test } from '@jest/globals';

import {
  applyStoreRowOperations,
  normalizeStoreRowOperations,
} from '../../lib/server/store-row-sync.js';

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
