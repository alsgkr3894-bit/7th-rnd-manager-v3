import { createHash, randomUUID } from 'node:crypto';

import { ALL_STORES } from '../db/constants.js';
import { SHARED_STORE_NAMES } from '../db/module-stores.js';

const KNOWN_STORE_SET = new Set(ALL_STORES);
const MAX_OPERATIONS = 500;
const MAX_RECORD_KEY_LENGTH = 512;
const MAX_BRAND_ID_LENGTH = 80;
const MAX_CLIENT_ID_LENGTH = 160;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return String(value ?? '').trim();
}

function jsonHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function int32(value) {
  if (!Number.isInteger(value)) return null;
  if (value < INT32_MIN || value > INT32_MAX) return null;
  return value;
}

function normalizeBrandId(value, fallback = 'main') {
  const brandId = text(value) || fallback;
  if (!brandId || brandId.length > MAX_BRAND_ID_LENGTH) {
    throw new Error('Invalid brandId.');
  }
  return brandId;
}

function normalizeRecordKey(value) {
  const recordKey = text(value);
  if (!recordKey || recordKey.length > MAX_RECORD_KEY_LENGTH) {
    throw new Error('Invalid recordKey.');
  }
  return recordKey;
}

function normalizeClientId(value) {
  const clientId = text(value);
  if (!clientId) return null;
  if (clientId.length > MAX_CLIENT_ID_LENGTH) {
    throw new Error('Invalid clientId.');
  }
  return clientId;
}

function sourceIdOf(clientId) {
  return clientId ? `client:${clientId}` : null;
}

function conflictRecordKey(recordKey, sourceId) {
  const suffix = createHash('sha256').update(sourceId).digest('hex').slice(0, 16);
  const tail = `__client:${suffix}`;
  const base = recordKey.slice(0, Math.max(1, MAX_RECORD_KEY_LENGTH - tail.length));
  return `${base}${tail}`;
}

function scopeForStore(storeName) {
  return SHARED_STORE_NAMES.has(storeName) ? 'SHARED' : 'BRAND';
}

function brandIdForOperation(operation, defaultBrandId) {
  const storeName = operation.storeName;
  if (SHARED_STORE_NAMES.has(storeName)) return 'main';
  return normalizeBrandId(operation.brandId, defaultBrandId);
}

export function normalizeStoreRowOperations(payload = {}) {
  const defaultBrandId = normalizeBrandId(payload.brandId, 'main');
  const operations = Array.isArray(payload.operations) ? payload.operations : [];
  if (operations.length > MAX_OPERATIONS) {
    throw new Error(`Too many store row sync operations. Max ${MAX_OPERATIONS}.`);
  }

  return operations.map((operation, index) => {
    if (!isPlainRecord(operation)) {
      throw new Error(`Operation ${index} must be an object.`);
    }

    const type = text(operation.type);
    const storeName = text(operation.storeName);
    if (!KNOWN_STORE_SET.has(storeName)) {
      throw new Error(`Unknown storeName '${storeName}'.`);
    }

    const scope = scopeForStore(storeName);
    const brandId = brandIdForOperation(operation, defaultBrandId);
    const clientId = normalizeClientId(operation.clientId);
    const sourceId = sourceIdOf(clientId);

    if (type === 'clear') {
      return { type, storeName, brandId, scope, sourceId };
    }

    const recordKey = normalizeRecordKey(operation.recordKey);

    if (type === 'delete') {
      return { type, storeName, brandId, scope, recordKey, sourceId };
    }

    if (type !== 'upsert') {
      throw new Error(`Unsupported store row sync operation '${type}'.`);
    }
    if (!isPlainRecord(operation.data)) {
      throw new Error(`Operation ${index} data must be an object.`);
    }

    return {
      type,
      storeName,
      brandId,
      scope,
      recordKey,
      sourceId,
      data: operation.data,
      legacyNumericId: int32(operation.legacyNumericId ?? operation.data.id),
      dataHash: jsonHash(operation.data),
    };
  });
}

async function resolveUpsertRecordKey(tx, operation) {
  if (!operation.sourceId) return operation.recordKey;

  const existing = await tx.storeRow.findUnique({
    where: {
      brandId_storeName_recordKey: {
        brandId: operation.brandId,
        storeName: operation.storeName,
        recordKey: operation.recordKey,
      },
    },
    select: { dataHash: true, sourceBackupId: true },
  });
  if (!existing) return operation.recordKey;
  if (existing.sourceBackupId === operation.sourceId) return operation.recordKey;
  if (!existing.sourceBackupId && existing.dataHash === operation.dataHash)
    return operation.recordKey;

  return conflictRecordKey(operation.recordKey, operation.sourceId);
}

function scopedDeleteWhere(operation) {
  const base = {
    brandId: operation.brandId,
    storeName: operation.storeName,
  };
  if (!operation.sourceId) return base;
  return { ...base, sourceBackupId: operation.sourceId };
}

async function ensureBrands(tx, brandIds) {
  for (const brandId of brandIds) {
    await tx.brand.upsert({
      where: { id: brandId },
      update: {},
      create: {
        id: brandId,
        name: brandId,
        code: null,
        hidden: false,
        metadata: { source: 'client_store_sync' },
      },
    });
  }
}

export async function applyStoreRowOperations(prisma, payload = {}) {
  const operations = normalizeStoreRowOperations(payload);
  if (operations.length === 0) {
    return { ok: true, applied: 0, upserted: 0, deleted: 0, cleared: 0 };
  }

  const brandIds = new Set(operations.map(operation => operation.brandId));
  let upserted = 0;
  let deleted = 0;
  let cleared = 0;

  await prisma.$transaction(async tx => {
    await ensureBrands(tx, brandIds);

    for (const operation of operations) {
      if (operation.type === 'clear') {
        await tx.storeRow.deleteMany({
          where: scopedDeleteWhere(operation),
        });
        cleared += 1;
        continue;
      }

      if (operation.type === 'delete') {
        await tx.storeRow.deleteMany({
          where: {
            ...scopedDeleteWhere(operation),
            brandId: operation.brandId,
            storeName: operation.storeName,
            recordKey: operation.recordKey,
          },
        });
        deleted += 1;
        continue;
      }

      const recordKey = await resolveUpsertRecordKey(tx, operation);

      await tx.storeRow.upsert({
        where: {
          brandId_storeName_recordKey: {
            brandId: operation.brandId,
            storeName: operation.storeName,
            recordKey,
          },
        },
        update: {
          scope: operation.scope,
          legacyNumericId: operation.legacyNumericId,
          data: operation.data,
          dataHash: operation.dataHash,
          sourceBackupId: operation.sourceId,
        },
        create: {
          id: randomUUID(),
          brandId: operation.brandId,
          storeName: operation.storeName,
          scope: operation.scope,
          recordKey,
          legacyNumericId: operation.legacyNumericId,
          data: operation.data,
          dataHash: operation.dataHash,
          sourceBackupId: operation.sourceId,
        },
      });
      upserted += 1;
    }
  });

  return {
    ok: true,
    applied: operations.length,
    upserted,
    deleted,
    cleared,
  };
}
