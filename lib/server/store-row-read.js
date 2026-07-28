/**
 * lib/server/store-row-read.js — store_rows 읽기(서버 → 브라우저)
 *
 * `store-row-sync.js` 가 브라우저의 IndexedDB 쓰기를 Postgres로 밀어 넣는 쪽이라면,
 * 이 모듈은 그 반대로 저장된 행을 다시 내려주는 쪽이다. LAN의 뷰어 PC가 자기 IndexedDB를
 * 서버 데이터로 채울 때 쓴다.
 *
 * 설계 메모:
 * - Prisma Client API(groupBy/findMany)만 쓴다. raw SQL을 피하면 `COUNT(*)` 가 BigInt로
 *   와서 `Response.json` 이 터지는 문제와 인젝션 표면이 함께 사라지고, 기존
 *   `server-store-row-sync.test.mjs` 처럼 가짜 prisma 객체로 테스트할 수 있다.
 * - 스토어 목록은 `scope` 컬럼이 아니라 ALL_STORES + SHARED_STORE_NAMES에서 도출한다.
 *   과거에 잘못 기록된 scope 값을 신뢰하지 않기 위해서다.
 * - 여러 브라우저가 같은 recordKey를 밀어 올렸을 때 서버가 만들어 둔 분기 행
 *   (`<key>__client:<hash>`)은 기본적으로 숨긴다. 자세한 배경은 store-row-sync.js 의
 *   resolveUpsertRecordKey 참고.
 */
import { ALL_STORES } from '../db/constants.js';
import { SHARED_STORE_NAMES } from '../db/module-stores.js';

/**
 * LAN 읽기 API로 절대 내보내지 않는 store.
 *
 * `rnd_login_credentials` 는 외부 사이트 비밀번호를 **평문**으로 들고 있고
 * (lib/rnd/login-info.js 의 `password: String(...)`), `rnd_corporate_card_entries` 는
 * 법인카드 사용 내역이다. 앱은 이미 두 화면을 관리자 전용으로 취급한다
 * (lib/navigation/role-visibility.js 의 EDIT_ONLY_HREFS).
 *
 * 이 API에는 인증이 없다(middleware.ts 가 /api/ 를 공개 경로로 둔다). 포트에 닿는
 * 사람은 누구나 읽을 수 있으므로, 화면에서만 가리는 것으로는 부족하고 서빙 자체를 막는다.
 * 운영 PC에는 이미 로컬 IndexedDB에 있으므로 기능 손실은 없다.
 */
export const LAN_EXCLUDED_STORE_NAMES = new Set([
  'rnd_login_credentials',
  'rnd_corporate_card_entries',
]);

const READABLE_STORES = ALL_STORES.filter(name => !LAN_EXCLUDED_STORE_NAMES.has(name));
const KNOWN_STORE_SET = new Set(READABLE_STORES);
const BRAND_STORES = READABLE_STORES.filter(name => !SHARED_STORE_NAMES.has(name));
const SHARED_STORES = READABLE_STORES.filter(name => SHARED_STORE_NAMES.has(name));

/** 서버가 충돌 회피용으로 붙이는 접미사. 정상 recordKey에는 나타나지 않는다. */
export const FORKED_KEY_MARKER = '__client:';

const MAX_BRAND_ID_LENGTH = 80;
const DEFAULT_MAX_ROWS = 50;
const MAX_MAX_ROWS = 200;
const MIN_MAX_BYTES = 64 * 1024;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;
const MAX_MAX_BYTES = 8 * 1024 * 1024;

function text(value) {
  return String(value ?? '').trim();
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(text(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeReadBrandId(value) {
  const brandId = text(value) || 'main';
  if (brandId.length > MAX_BRAND_ID_LENGTH) throw new Error('Invalid brandId.');
  return brandId;
}

/** 공유 스토어(노트·샘플 등)는 브랜드와 무관하게 항상 main에 저장된다. */
export function resolveReadBrandId(storeName, brandId) {
  if (SHARED_STORE_NAMES.has(storeName)) return 'main';
  return normalizeReadBrandId(brandId);
}

/**
 * GET 쿼리스트링을 검증된 조회 조건으로 변환.
 * @param {{ get: (key: string) => string | null }} searchParams
 */
export function normalizeStoreRowQuery(searchParams) {
  const read = key => searchParams?.get?.(key) ?? null;
  const storeName = text(read('storeName'));
  // 제외 목록은 "모르는 store"와 구분해 명확히 거절한다(오탐으로 오해하지 않도록).
  if (LAN_EXCLUDED_STORE_NAMES.has(storeName)) {
    throw new Error(`Store '${storeName}' is not readable over the network.`);
  }
  if (!KNOWN_STORE_SET.has(storeName)) {
    throw new Error(`Unknown storeName '${storeName}'.`);
  }
  return {
    storeName,
    brandId: resolveReadBrandId(storeName, read('brandId')),
    after: text(read('after')),
    maxRows: clampInt(read('maxRows'), DEFAULT_MAX_ROWS, 1, MAX_MAX_ROWS),
    maxBytes: clampInt(read('maxBytes'), DEFAULT_MAX_BYTES, MIN_MAX_BYTES, MAX_MAX_BYTES),
    includeForked: text(read('includeForked')) === '1',
  };
}

function groupBy(prisma, brandId, storeNames, forkedOnly) {
  if (storeNames.length === 0) return Promise.resolve([]);
  const where = { brandId, storeName: { in: storeNames } };
  if (forkedOnly) where.recordKey = { contains: FORKED_KEY_MARKER };
  return prisma.storeRow.groupBy({
    by: ['storeName'],
    where,
    _count: { _all: true },
    _max: { updatedAt: true },
  });
}

function isoOf(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function countOf(group) {
  const raw = group?._count?._all ?? group?._count ?? 0;
  return typeof raw === 'number' ? raw : Number(raw) || 0;
}

/**
 * 스토어별 행 수·분기행 수·최종 수정시각. 하이드레이션 진행률의 분모이자
 * "무시된 중복 N건" 표시의 원본.
 */
export async function readStoreRowManifest(prisma, { brandId } = {}) {
  const safeBrandId = normalizeReadBrandId(brandId);

  const [brandTotals, sharedTotals, brandForked, sharedForked] = await Promise.all([
    groupBy(prisma, safeBrandId, BRAND_STORES, false),
    groupBy(prisma, 'main', SHARED_STORES, false),
    groupBy(prisma, safeBrandId, BRAND_STORES, true),
    groupBy(prisma, 'main', SHARED_STORES, true),
  ]);

  const stores = new Map();
  const entryFor = (storeName, rowBrandId) => {
    if (!stores.has(storeName)) {
      stores.set(storeName, {
        storeName,
        brandId: rowBrandId,
        shared: SHARED_STORE_NAMES.has(storeName),
        rows: 0,
        forkedRows: 0,
        updatedAt: null,
      });
    }
    return stores.get(storeName);
  };

  for (const [groups, rowBrandId] of [
    [brandTotals, safeBrandId],
    [sharedTotals, 'main'],
  ]) {
    for (const group of groups) {
      const entry = entryFor(group.storeName, rowBrandId);
      entry.rows = countOf(group);
      entry.updatedAt = isoOf(group?._max?.updatedAt);
    }
  }

  for (const [groups, rowBrandId] of [
    [brandForked, safeBrandId],
    [sharedForked, 'main'],
  ]) {
    for (const group of groups) {
      entryFor(group.storeName, rowBrandId).forkedRows = countOf(group);
    }
  }

  // rows 는 총 행 수였다. 실제로 내려받게 될 수(분기행 제외)로 바꾼다.
  const list = [...stores.values()]
    .map(entry => ({
      ...entry,
      totalRows: entry.rows,
      rows: Math.max(0, entry.rows - entry.forkedRows),
    }))
    .filter(entry => entry.totalRows > 0)
    .sort((a, b) => a.storeName.localeCompare(b.storeName));

  return {
    ok: true,
    brandId: safeBrandId,
    stores: list,
    totalRows: list.reduce((sum, entry) => sum + entry.rows, 0),
    totalForkedRows: list.reduce((sum, entry) => sum + entry.forkedRows, 0),
    checkedAt: new Date().toISOString(),
  };
}

function byteLengthOf(data) {
  try {
    return Buffer.byteLength(JSON.stringify(data ?? null), 'utf8');
  } catch {
    return 0;
  }
}

/**
 * recordKey 기준 keyset 페이지네이션. `@@index([brandId, storeName])` 를 타고,
 * OFFSET 없이 커서만으로 전진한다.
 */
export async function readStoreRowPage(prisma, query) {
  const { storeName, brandId, after, maxRows, maxBytes, includeForked } = query;

  const recordKeyFilter = {};
  if (after) recordKeyFilter.gt = after;
  if (!includeForked) recordKeyFilter.not = { contains: FORKED_KEY_MARKER };

  const where = { brandId, storeName };
  if (Object.keys(recordKeyFilter).length > 0) where.recordKey = recordKeyFilter;

  const found = await prisma.storeRow.findMany({
    where,
    orderBy: { recordKey: 'asc' },
    take: maxRows,
    select: { recordKey: true, legacyNumericId: true, data: true },
  });

  // 응답 크기를 예산 안으로 자른다. 노트·샘플에는 base64 사진이 들어 있어 한 행이
  // 수 MB일 수 있다. 단, 첫 행은 예산을 넘더라도 반드시 실어 보낸다 — 그렇지 않으면
  // 커서가 그 행에서 영원히 멈춘다.
  const rows = [];
  let bytes = 0;
  for (const row of found) {
    const size = byteLengthOf(row.data);
    if (rows.length > 0 && bytes + size > maxBytes) break;
    rows.push(row);
    bytes += size;
  }

  return {
    ok: true,
    brandId,
    storeName,
    rows,
    bytes,
    nextCursor: rows.length > 0 ? rows[rows.length - 1].recordKey : null,
    done: rows.length === 0,
  };
}
