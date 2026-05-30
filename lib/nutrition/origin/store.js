/**
 * lib/nutrition/origin/store.js — nutrition_origin_master CRUD
 *
 * cost_ingredients 식재료와 연결 후 원산지 정보 관리.
 *
 * 레코드 구조:
 *   id              autoIncrement PK
 *   ingredientId    cost_ingredients.id (연결 기준)
 *   productCode     제때 제품코드 (null 가능)
 *   ingredientName  원래 재료명 (cost_ingredients 기준)
 *   displayName     출력용 표기명 (별도 지정 가능, e.g. '밀가루' → '밀')
 *   originCountry   원산지 국가 (e.g. '미국', '국내산')
 *   originRegion    원산지 세부 (선택)
 *   note            비고
 *   displayOrder    정렬 순서
 *   updatedAt       ISO string
 */

import { getAll, getByIndex, put, deleteById, clearStore, hasStore, runTransaction } from '@/lib/db';
import { logWork } from '@/lib/work-log';

const STORE = 'nutrition_origin_master';

export async function getAllOrigins() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko'));
}

/** ingredientId → origin 레코드 맵 */
export async function getOriginByIngredientId(ingredientId) {
  if (!hasStore(STORE)) return null;
  const rows = await getAll(STORE);
  return rows.find(r => r.ingredientId === ingredientId) || null;
}

export async function upsertOrigin(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const record = { ...data, updatedAt: new Date().toISOString() };

  // id가 명시된 경우: 그대로 put (UPDATE)
  if (record.id != null) return await put(STORE, record);

  // id 없고 ingredientName 있는 경우: readwrite 트랜잭션 하나로 조회+저장 원자 처리
  if (record.ingredientName) {
    delete record.id;
    return await runTransaction([STORE], 'readwrite', tx => {
      return new Promise((resolve, reject) => {
        const store = tx.objectStore(STORE);
        const idxReq = store.index('ingredientName').getAll(record.ingredientName);
        idxReq.onsuccess = () => {
          const first = idxReq.result?.[0];
          if (first?.id != null) record.id = first.id;
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve(putReq.result);
          putReq.onerror  = () => reject(putReq.error);
        };
        idxReq.onerror = () => reject(idxReq.error);
      });
    });
  }

  // ingredientName도 없으면 단순 insert
  delete record.id;
  const result = await put(STORE, record);
  logWork('ORIGIN_SAVE', data.ingredientName || '원산지');
  return result;
}

export async function deleteOrigin(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  return await deleteById(STORE, id);
}

export async function clearAllOrigins() {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  return await clearStore(STORE);
}
