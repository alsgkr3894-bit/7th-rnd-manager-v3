import {
  initSharedDB,
  sharedDeleteById,
  sharedGetAll,
  sharedHasStore,
  sharedPut,
} from '@/lib/db/shared';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { asObjectArray } from '@/lib/ui/prop-guards';

const STORE = 'market_research';

export const MARKET_RESEARCH_TYPES = ['시장분석', '올해트렌드', '타브랜드참고', '개발포인트'];

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeType(value) {
  const text = clean(value);
  return MARKET_RESEARCH_TYPES.includes(text) ? text : MARKET_RESEARCH_TYPES[0];
}

function normalizeRecord(data = {}) {
  return {
    ...data,
    type: normalizeType(data.type),
    date: clean(data.date),
    brand: clean(data.brand),
    title: clean(data.title),
    competitor: clean(data.competitor),
    marketTrend: clean(data.marketTrend),
    referencePoint: clean(data.referencePoint),
    developmentDirection: clean(data.developmentDirection),
    actionIdea: clean(data.actionIdea),
    tags: clean(data.tags),
    photos: asObjectArray(data.photos),
    updatedAt: data.updatedAt || '',
    createdAt: data.createdAt || '',
  };
}

function sortRows(rows) {
  return asObjectArray(rows)
    .map(normalizeRecord)
    .sort((a, b) =>
      clean(b.date || b.updatedAt || b.createdAt).localeCompare(
        clean(a.date || a.updatedAt || a.createdAt),
        'ko'
      )
    );
}

export async function getAllMarketResearch() {
  await initSharedDB();
  if (!sharedHasStore(STORE)) return [];
  return sortRows(await sharedGetAll(STORE));
}

export async function saveMarketResearch(data) {
  await assertActiveAdmin('시장조사 저장');
  await initSharedDB();
  if (!sharedHasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const now = new Date().toISOString();
  const record = normalizeRecord({
    ...data,
    createdAt: data?.createdAt || now,
    updatedAt: now,
  });
  // 신규 작성 폼은 id가 null로 채워져 있다. keyPath(autoIncrement)에 null이 그대로
  // 남아있으면 IDBObjectStore.put()이 "유효한 key가 아니다"라며 DataError를 던져
  // 신규 저장이 전부 실패한다 — id를 지워야 자동 증가로 새 키가 발급된다.
  if (record.id == null) delete record.id;
  return sharedPut(STORE, record);
}

export async function deleteMarketResearch(id) {
  await assertActiveAdmin('시장조사 삭제');
  await initSharedDB();
  if (!sharedHasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  return sharedDeleteById(STORE, id);
}
