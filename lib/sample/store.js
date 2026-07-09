import {
  initSharedDB,
  sharedGetAll as getAll,
  sharedGetById as getById,
  sharedRunTransaction as runTransaction,
  sharedHasStore as hasStore,
} from '@/lib/db/shared';
import { logWork } from '@/lib/work-log';
import { asDisplayText, asObjectArray, asTimestamp } from '@/lib/ui/prop-guards';
import { getActiveBrandId } from '@/lib/active-brand';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { LEGACY_SAMPLE_RECORD_TYPES, SAMPLE_RECORD_TYPES } from './constants';

const STORE = 'sample_records';

const byCreatedAtDesc = (a, b) => asTimestamp(b?.createdAt) - asTimestamp(a?.createdAt);

function storeOf(tx) {
  return tx.objectStore(STORE);
}

function activeBrandId() {
  return getActiveBrandId() || 'main';
}

function brandOf(row) {
  return (asDisplayText(row?.brand) || 'main').trim() || 'main';
}

function belongsToActiveBrand(row) {
  return brandOf(row) === activeBrandId();
}

function toNullableId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data || {}, key);
}

function valueOf(data, existing, key, fallback = '') {
  if (hasOwn(data, key)) return data[key];
  if (hasOwn(existing, key)) return existing[key];
  return fallback;
}

/** 0–5 범위의 정수로 정규화, 범위 밖이면 0 */
function clampRating(val) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.round(n) : 0;
}

export async function getAllSamples() {
  await initSharedDB(); // 비-main 직접 진입 시 main 공유 DB 보장
  if (!hasStore(STORE)) return [];
  const rows = asObjectArray(await getAll(STORE));
  return rows.filter(belongsToActiveBrand).sort(byCreatedAtDesc);
}

export async function getSampleById(id) {
  await initSharedDB();
  if (!hasStore(STORE)) return null;
  const record = await getById(STORE, id);
  return record && belongsToActiveBrand(record) ? record : null;
}

export async function addSample(data) {
  await initSharedDB();
  await assertActiveAdmin('식자재 이슈 및 테스트 /샘플기록 추가');
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const now = new Date().toISOString();
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).add({ ...buildRecord(data), createdAt: now });
  });
  logWork('SAMPLE_SAVE', data.title || data.menuName || '식자재 이슈 및 테스트 /샘플기록').catch(
    e => console.warn('[sample/store] logWork 실패', e)
  );
}

export async function updateSample(id, data) {
  await initSharedDB();
  await assertActiveAdmin('식자재 이슈 및 테스트 /샘플기록 수정');
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getSampleById(id);
  if (!existing) throw new Error('샘플을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).put({ ...existing, ...buildRecord(data, existing), id });
  });
  logWork('SAMPLE_SAVE', data.title || data.menuName || '샘플 수정', { ref: id }).catch(e =>
    console.warn('[sample/store] logWork 실패', e)
  );
}

/** 노트 목록 상태 드롭다운에서 샘플 레코드 상태를 변경·저장한다. */
export async function updateSampleStatus(id, status) {
  await initSharedDB();
  await assertActiveAdmin('샘플 상태 변경');
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getSampleById(id);
  if (!existing) throw new Error('샘플을 찾을 수 없습니다');
  const next = {
    ...existing,
    status: asDisplayText(status).trim(),
    updatedAt: new Date().toISOString(),
  };
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).put(next);
  });
  logWork('SAMPLE_SAVE', `${existing.title || existing.menuName || '샘플'} 상태 → ${status}`, {
    ref: id,
  }).catch(e => console.warn('[sample/store] logWork 실패', e));
  return [id];
}

export async function deleteSample(id) {
  await initSharedDB();
  await assertActiveAdmin('식자재 이슈 및 테스트 /샘플기록 삭제');
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const rec = await getSampleById(id).catch(() => null);
  if (!rec) throw new Error('샘플을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).delete(id);
  });
  logWork('DELETE', `샘플 삭제: ${rec?.title || rec?.menuName || '샘플'}`, { ref: id }).catch(
    () => {}
  );
}

/** 샘플명 배열 정규화 (빈값 제거). 구버전 레코드는 단일 menuName에서 이전 */
function normalizeSampleNames(arr, legacyMenuName) {
  if (Array.isArray(arr)) {
    const names = arr.map(s => asDisplayText(s).trim()).filter(Boolean);
    if (names.length) return names;
  }
  const mn = asDisplayText(legacyMenuName).trim();
  return mn ? [mn] : [];
}

/** 레코드의 샘플명 배열 (구버전 menuName fallback) */
export function sampleNamesOf(rec) {
  if (Array.isArray(rec?.sampleNames) && rec.sampleNames.length) {
    const names = rec.sampleNames.map(s => asDisplayText(s).trim()).filter(Boolean);
    if (names.length) return names;
  }
  const mn = asDisplayText(rec?.menuName).trim();
  return mn ? [mn] : [];
}

/** 샘플명들을 ', '로 합친 표시 문자열 */
export function sampleNamesText(rec) {
  return sampleNamesOf(rec).join(', ');
}

export function normalizeSampleRecordType(value) {
  return value === SAMPLE_RECORD_TYPES.ISSUE || value === LEGACY_SAMPLE_RECORD_TYPES.ISSUE
    ? SAMPLE_RECORD_TYPES.ISSUE
    : SAMPLE_RECORD_TYPES.SAMPLE_TEST;
}

export function sampleIngredientGroupName(rec = {}) {
  const direct = asDisplayText(rec?.ingredientGroupName).trim();
  if (direct) return direct;
  const firstName = sampleNamesOf(rec)[0];
  if (firstName) return firstName;
  return asDisplayText(rec?.category).trim() || '미지정 식자재';
}

function buildRecord(data = {}, existing = {}) {
  const sampleNames = normalizeSampleNames(
    valueOf(data, existing, 'sampleNames', []),
    valueOf(data, existing, 'menuName', '')
  );
  const brand = valueOf(data, existing, 'brand', activeBrandId());
  const photos = valueOf(data, existing, 'photos', []);
  const linkedProducts = valueOf(data, existing, 'linkedProducts', []);
  return {
    brand: (asDisplayText(brand) || 'main').trim(),
    title: asDisplayText(valueOf(data, existing, 'title', '')).trim(),
    sampleNames,
    // 비정규화: 검색/캘린더/logWork 등 menuName 의존 코드 호환용
    menuName: sampleNames.join(', '),
    recordType: normalizeSampleRecordType(valueOf(data, existing, 'recordType', '')),
    ingredientGroupName: asDisplayText(valueOf(data, existing, 'ingredientGroupName', '')).trim(),
    ingredientGroupCode: asDisplayText(valueOf(data, existing, 'ingredientGroupCode', '')).trim(),
    ingredientId: toNullableId(valueOf(data, existing, 'ingredientId', null)),
    category: asDisplayText(valueOf(data, existing, 'category', '')).trim(),
    testDate: asDisplayText(valueOf(data, existing, 'testDate', '')).trim(),
    testRound: asDisplayText(valueOf(data, existing, 'testRound', '')).trim(),
    company: asDisplayText(valueOf(data, existing, 'company', '')).trim(),
    tester: asDisplayText(valueOf(data, existing, 'tester', '')).trim(),
    rating: clampRating(valueOf(data, existing, 'rating', 0)),
    // 노트 목록에서 편집 가능한 상태(테스트/보류/출시 등). 빈 값이면 유형에서 파생.
    status: asDisplayText(valueOf(data, existing, 'status', '')).trim(),
    price: asDisplayText(valueOf(data, existing, 'price', '')).trim(),
    priceTaxType: valueOf(data, existing, 'priceTaxType', 'incl') === 'excl' ? 'excl' : 'incl',
    description: asDisplayText(valueOf(data, existing, 'description', '')).trim(),
    result: asDisplayText(valueOf(data, existing, 'result', '')).trim(),
    improvements: asDisplayText(valueOf(data, existing, 'improvements', '')).trim(),
    nextAction: asDisplayText(valueOf(data, existing, 'nextAction', '')).trim(),
    tags: asDisplayText(valueOf(data, existing, 'tags', '')).trim(),
    photos: Array.isArray(photos) ? photos : [],
    parentId: toNullableId(valueOf(data, existing, 'parentId', null)),
    linkedNoteId: valueOf(data, existing, 'linkedNoteId', null) ?? null,
    linkedProducts: Array.isArray(linkedProducts) ? linkedProducts : [],
    updatedAt: new Date().toISOString(),
  };
}
