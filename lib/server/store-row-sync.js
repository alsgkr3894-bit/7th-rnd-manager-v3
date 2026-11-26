import { createHash, randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { ALL_STORES } from '../db/constants.js';
import { SHARED_STORE_NAMES } from '../db/module-stores.js';
import { LAN_EXCLUDED_STORE_NAMES } from './sensitive-stores.js';

// 로그인정보·법인카드 등 민감 store는 쓰기(upsert/delete/clear)도 거부한다.
// 읽기 API(store-row-read.js)와 같은 목록을 공유 — 한쪽에서만 막으면 반대쪽으로 새어나간다.
// 운영 PC의 로컬 IndexedDB에는 그대로 남으므로 기능 손실은 없다.
const WRITABLE_STORES = ALL_STORES.filter(name => !LAN_EXCLUDED_STORE_NAMES.has(name));
const KNOWN_STORE_SET = new Set(WRITABLE_STORES);
const MAX_OPERATIONS = 500;
const MAX_RECORD_KEY_LENGTH = 512;
const MAX_BRAND_ID_LENGTH = 80;
const MAX_CLIENT_ID_LENGTH = 160;
const MAX_OP_ID_LENGTH = 80;
// 적용한 작업 ID 기록. 별도 표를 만들지 않고 server_settings에 두며, 재전송이 올 수 있는
// 기간이 지나면 지운다(브라우저가 이보다 오래 못 보낸 작업은 다시 적용될 수 있다).
const OP_LEDGER_CATEGORY = 'sync-op';
export const OP_LEDGER_RETENTION_DAYS = 14;
const OP_LEDGER_PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastLedgerPruneAt = 0;
// 개별 upsert 레코드 직렬화 상한(DoS 백스톱). 노트/샘플은 base64 사진을 포함할 수 있어
// 정상 레코드를 막지 않을 만큼 넉넉히 두되, 비정상적으로 큰 단일 blob은 거부한다.
const MAX_DATA_BYTES = 16 * 1024 * 1024;
// 한 번의 INSERT·DELETE에 담는 상한. 행마다 따로 보내면 500건 묶음이 트랜잭션을 오래 붙잡는다.
const BULK_UPSERT_ROWS = 100;
const BULK_UPSERT_CHARS = 8 * 1024 * 1024;
const BULK_DELETE_KEYS = 500;
// Prisma의 대화형 트랜잭션 기본 5초로는 사진이 든 묶음이 중간에 끊겨 계속 재전송될 수 있다.
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 };
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return String(value ?? '').trim();
}

function hashString(str) {
  return createHash('sha256').update(str).digest('hex');
}

function int32(value) {
  if (!Number.isInteger(value)) return null;
  if (value < INT32_MIN || value > INT32_MAX) return null;
  return value;
}

/**
 * 요청 내용이 잘못됐을 때(알 수 없는 store, 너무 큰 데이터 …)만 던진다. 라우트는 이것만 400(영구
 * 거절)으로 답하고, DB 다운·연결 실패 같은 나머지는 503(일시 장애)으로 답해 클라이언트가 재시도하게 한다.
 */
export class StoreRowValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StoreRowValidationError';
  }
}

function normalizeBrandId(value, fallback = 'main') {
  const brandId = text(value) || fallback;
  if (!brandId || brandId.length > MAX_BRAND_ID_LENGTH) {
    throw new StoreRowValidationError('Invalid brandId.');
  }
  return brandId;
}

function normalizeRecordKey(value) {
  const recordKey = text(value);
  if (!recordKey || recordKey.length > MAX_RECORD_KEY_LENGTH) {
    throw new StoreRowValidationError('Invalid recordKey.');
  }
  return recordKey;
}

function normalizeClientId(value) {
  const clientId = text(value);
  if (!clientId) return null;
  if (clientId.length > MAX_CLIENT_ID_LENGTH) {
    throw new StoreRowValidationError('Invalid clientId.');
  }
  return clientId;
}

function normalizeOpId(value) {
  const opId = text(value);
  if (!opId) return null;
  if (opId.length > MAX_OP_ID_LENGTH) throw new StoreRowValidationError('Invalid opId.');
  return opId;
}

const ledgerKey = opId => `${OP_LEDGER_CATEGORY}:${opId}`;

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
    throw new StoreRowValidationError(`Too many store row sync operations. Max ${MAX_OPERATIONS}.`);
  }

  return operations.map((operation, index) => {
    if (!isPlainRecord(operation)) {
      throw new StoreRowValidationError(`Operation ${index} must be an object.`);
    }

    const type = text(operation.type);
    const storeName = text(operation.storeName);
    if (!KNOWN_STORE_SET.has(storeName)) {
      throw new StoreRowValidationError(`Unknown storeName '${storeName}'.`);
    }

    const scope = scopeForStore(storeName);
    const brandId = brandIdForOperation(operation, defaultBrandId);
    const clientId = normalizeClientId(operation.clientId);
    const sourceId = sourceIdOf(clientId);
    const opId = normalizeOpId(operation.opId);

    if (type === 'clear') {
      return { type, storeName, brandId, scope, sourceId, opId };
    }

    const recordKey = normalizeRecordKey(operation.recordKey);

    if (type === 'delete') {
      return { type, storeName, brandId, scope, recordKey, sourceId, opId };
    }

    if (type !== 'upsert') {
      throw new StoreRowValidationError(`Unsupported store row sync operation '${type}'.`);
    }
    if (!isPlainRecord(operation.data)) {
      throw new StoreRowValidationError(`Operation ${index} data must be an object.`);
    }

    let serialized;
    try {
      serialized = JSON.stringify(operation.data);
    } catch {
      throw new StoreRowValidationError(`Operation ${index} data is not serializable.`);
    }
    const dataBytes = Buffer.byteLength(serialized, 'utf8');
    if (dataBytes > MAX_DATA_BYTES) {
      throw new StoreRowValidationError(
        `Operation ${index} data too large (${dataBytes} bytes, max ${MAX_DATA_BYTES}).`
      );
    }

    return {
      type,
      storeName,
      brandId,
      scope,
      recordKey,
      sourceId,
      opId,
      data: operation.data,
      legacyNumericId: int32(operation.legacyNumericId ?? operation.data.id),
      dataHash: hashString(serialized),
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

/**
 * 작업 ID를 같은 트랜잭션에 기록하고, 처음 보는 작업만 돌려준다. 응답을 못 받은 브라우저가
 * 다시 보내거나 같은 작업이 동시에 두 번 와도 한 번만 적용된다(뒤 요청은 기록에서 걸러진다).
 */
async function claimNewOperations(tx, operations) {
  const keys = [...new Set(operations.filter(op => op.opId).map(op => ledgerKey(op.opId)))];
  if (keys.length === 0) return operations;
  const created = await tx.serverSetting.createManyAndReturn({
    data: keys.map(key => ({ key, value: true, category: OP_LEDGER_CATEGORY })),
    skipDuplicates: true,
    select: { key: true },
  });
  const fresh = new Set(created.map(row => row.key));
  // 한 요청 안에 같은 ID가 두 번 있으면 첫 번째만 적용한다
  return operations.filter(op => !op.opId || fresh.delete(ledgerKey(op.opId)));
}

async function pruneOperationLedger(tx, now = Date.now()) {
  if (now - lastLedgerPruneAt < OP_LEDGER_PRUNE_INTERVAL_MS) return;
  lastLedgerPruneAt = now;
  await tx.serverSetting.deleteMany({
    where: {
      category: OP_LEDGER_CATEGORY,
      createdAt: { lt: new Date(now - OP_LEDGER_RETENTION_DAYS * 24 * 60 * 60 * 1000) },
    },
  });
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

/**
 * 이어지는 작업 중 한 번에 실행해도 결과가 같은 것끼리 묶는다. 순서는 바꾸지 않는다.
 * - 운영 PC의 저장(sourceId 없음): 여러 저장소를 한 INSERT로
 * - 같은 저장소·출처의 삭제: 한 DELETE로
 * - 전체 비우기와 다른 출처의 저장(충돌 확인이 필요): 하나씩
 */
function groupOperations(operations) {
  const groups = [];
  for (const operation of operations) {
    let key = null;
    if (operation.type === 'upsert' && !operation.sourceId) key = 'upsert';
    else if (operation.type === 'delete') {
      key = JSON.stringify(['delete', operation.brandId, operation.storeName, operation.sourceId]);
    }
    const last = groups.at(-1);
    if (key && last?.key === key) last.operations.push(operation);
    else groups.push({ key, operations: [operation] });
  }
  return groups;
}

// 한 INSERT는 같은 행을 두 번 고칠 수 없다 — 같은 키는 마지막 값만 남긴다(최종 결과는 같다)
function upsertChunks(operations) {
  const latest = new Map();
  for (const operation of operations) {
    latest.set(
      JSON.stringify([operation.brandId, operation.storeName, operation.recordKey]),
      operation
    );
  }
  const chunks = [];
  let chunk = [];
  let chars = 0;
  for (const operation of latest.values()) {
    const json = JSON.stringify(operation.data);
    if (
      chunk.length >= BULK_UPSERT_ROWS ||
      (chunk.length > 0 && chars + json.length > BULK_UPSERT_CHARS)
    ) {
      chunks.push(chunk);
      chunk = [];
      chars = 0;
    }
    chunk.push({ operation, json });
    chars += json.length;
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}

async function bulkUpsert(tx, operations) {
  // 시각은 Prisma가 쓰는 것과 같이 UTC로 저장한다
  const now = Prisma.sql`(now() AT TIME ZONE 'UTC')`;
  for (const chunk of upsertChunks(operations)) {
    const rows = chunk.map(
      ({ operation, json }) =>
        Prisma.sql`(${randomUUID()}, ${operation.brandId}, ${operation.storeName}, ${operation.scope}::"StoreScope", ${operation.recordKey}, ${operation.legacyNumericId}::integer, ${json}::jsonb, ${operation.dataHash}, ${operation.sourceId}, ${now}, ${now})`
    );
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "store_rows"
        ("id", "brand_id", "store_name", "scope", "record_key", "legacy_numeric_id", "data",
         "data_hash", "source_backup_id", "created_at", "updated_at")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("brand_id", "store_name", "record_key") DO UPDATE SET
        "scope" = EXCLUDED."scope",
        "legacy_numeric_id" = EXCLUDED."legacy_numeric_id",
        "data" = EXCLUDED."data",
        "data_hash" = EXCLUDED."data_hash",
        "source_backup_id" = EXCLUDED."source_backup_id",
        "updated_at" = EXCLUDED."updated_at"`);
  }
}

async function bulkDelete(tx, operations) {
  const [first] = operations;
  const keys = [...new Set(operations.map(operation => operation.recordKey))];
  for (let i = 0; i < keys.length; i += BULK_DELETE_KEYS) {
    await tx.storeRow.deleteMany({
      where: {
        ...scopedDeleteWhere(first),
        recordKey: { in: keys.slice(i, i + BULK_DELETE_KEYS) },
      },
    });
  }
}

/** 다른 출처의 저장은 기존 행을 확인해 덮어쓸지 갈라 둘지 정해야 해서 하나씩 처리한다. */
async function upsertFromSource(tx, operation) {
  const recordKey = await resolveUpsertRecordKey(tx, operation);
  await bulkUpsert(tx, [{ ...operation, recordKey }]);
}

export async function applyStoreRowOperations(prisma, payload = {}) {
  const operations = normalizeStoreRowOperations(payload);
  if (operations.length === 0) {
    return { ok: true, applied: 0, upserted: 0, deleted: 0, cleared: 0, duplicates: 0 };
  }

  const brandIds = new Set(operations.map(operation => operation.brandId));
  let upserted = 0;
  let deleted = 0;
  let cleared = 0;
  let applied = 0;

  await prisma.$transaction(async tx => {
    await ensureBrands(tx, brandIds);
    const fresh = await claimNewOperations(tx, operations);
    applied = fresh.length;

    for (const group of groupOperations(fresh)) {
      const [first] = group.operations;
      if (first.type === 'clear') {
        await tx.storeRow.deleteMany({
          where: scopedDeleteWhere(first),
        });
        cleared += 1;
        continue;
      }
      if (first.type === 'delete') {
        await bulkDelete(tx, group.operations);
        deleted += group.operations.length;
        continue;
      }
      if (first.sourceId) await upsertFromSource(tx, first);
      else await bulkUpsert(tx, group.operations);
      upserted += group.operations.length;
    }
    if (operations.some(operation => operation.opId)) await pruneOperationLedger(tx);
  }, TRANSACTION_OPTIONS);

  return {
    ok: true,
    applied,
    upserted,
    deleted,
    cleared,
    duplicates: operations.length - applied,
  };
}
