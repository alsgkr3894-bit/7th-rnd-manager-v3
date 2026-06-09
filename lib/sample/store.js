import {
  initSharedDB,
  sharedGetAll as getAll,
  sharedGetById as getById,
  sharedRunTransaction as runTransaction,
  sharedHasStore as hasStore,
} from '@/lib/db/shared';
import { logWork } from '@/lib/work-log';
import { asDisplayText, asObjectArray, asTimestamp } from '@/lib/ui/prop-guards';

const STORE = 'sample_records';

const byCreatedAtDesc = (a, b) => asTimestamp(b?.createdAt) - asTimestamp(a?.createdAt);

function storeOf(tx) {
  return tx.objectStore(STORE);
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
  return rows.sort(byCreatedAtDesc);
}

export async function getSampleById(id) {
  await initSharedDB();
  if (!hasStore(STORE)) return null;
  return getById(STORE, id);
}

export async function addSample(data) {
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const now = new Date().toISOString();
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).add({ ...buildRecord(data), createdAt: now });
  });
  logWork('SAMPLE_SAVE', data.title || data.menuName || '샘플 기록');
}

export async function updateSample(id, data) {
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const existing = await getById(STORE, id);
  if (!existing) throw new Error('샘플을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    storeOf(tx).put({ ...existing, ...buildRecord(data), id });
  });
  logWork('SAMPLE_SAVE', data.title || data.menuName || '샘플 수정', { ref: id }).catch(e =>
    console.warn('[sample/store] logWork 실패', e)
  );
}

export async function deleteSample(id) {
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const rec = await getById(STORE, id).catch(() => null);
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

function buildRecord(data) {
  const sampleNames = normalizeSampleNames(data.sampleNames, data.menuName);
  return {
    title: (data.title || '').trim(),
    sampleNames,
    // 비정규화: 검색/캘린더/logWork 등 menuName 의존 코드 호환용
    menuName: sampleNames.join(', '),
    category: (data.category || '').trim(),
    testDate: (data.testDate || '').trim(),
    company: (data.company || '').trim(),
    tester: (data.tester || '').trim(),
    rating: clampRating(data.rating),
    price: data.price == null || data.price === '' ? '' : String(data.price).trim(),
    priceTaxType: data.priceTaxType === 'excl' ? 'excl' : 'incl',
    description: (data.description || '').trim(),
    result: (data.result || '').trim(),
    improvements: (data.improvements || '').trim(),
    nextAction: (data.nextAction || '').trim(),
    tags: (data.tags || '').trim(),
    photos: Array.isArray(data.photos) ? data.photos : [],
    linkedNoteId: data.linkedNoteId ?? null,
    linkedProducts: Array.isArray(data.linkedProducts) ? data.linkedProducts : [],
    updatedAt: new Date().toISOString(),
  };
}
