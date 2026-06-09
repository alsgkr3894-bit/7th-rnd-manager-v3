/**
 * lib/cost/menu-price/store.js — cost_selling_prices CRUD
 *
 * 레코드 구조:
 *   id         autoIncrement PK
 *   menuName   메뉴명 (예: '슈퍼콤비네이션')
 *   category   분류 ('피자' | '1인피자' | '사이드' | '세트박스' | '')
 *   size       규격 ('L' | 'R' | '단일')
 *   price      판매가 (정수원, 부가세포함)
 *   note       비고
 *   updatedAt  ISO
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { generateMenuCode, generateMenuCodesForBatch } from './code';
import { syncMenuMasterFromPrices } from '@/lib/menu-master';

const STORE = 'cost_selling_prices';
const s = tx => tx.objectStore(STORE);

async function _syncAfter(rows) {
  await syncMenuMasterFromPrices(rows).catch(e => console.error('[menu-master sync]', e));
}

export async function getAllMenuPrices() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => {
    const ca = a.category || 'ㅎ',
      cb = b.category || 'ㅎ';
    if (ca !== cb) return ca.localeCompare(cb, 'ko');
    const na = a.menuName || '',
      nb = b.menuName || '';
    if (na !== nb) return na.localeCompare(nb, 'ko');
    return (a.size || '').localeCompare(b.size || '', 'ko');
  });
}

export async function addMenuPrice(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const existing = await getAll(STORE);
  const menuCode = data.menuCode || generateMenuCode(data, existing);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).add(buildRecord({ ...data, menuCode }));
  });
  const allAfter = await getAll(STORE);
  await _syncAfter(allAfter);
  return { menuCode };
}

export async function updateMenuPrice(id, data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('항목을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).put({ ...existing, ...buildRecord(data), id });
  });
  const allAfter = await getAll(STORE);
  await _syncAfter(allAfter);
}

export async function deleteMenuPrice(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });
  const allAfter = await getAll(STORE);
  await _syncAfter(allAfter);
}

/** 전체 초기화 (업로드 일괄 교체 전 호출) */
export async function resetAllMenuPrices() {
  if (!hasStore(STORE)) return { deleted: 0 };
  const all = await getAll(STORE);
  const count = all.length;
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).clear();
  });
  return { deleted: count };
}

/**
 * 일괄 교체 — 기존 데이터를 모두 삭제하고 새 행 추가.
 * 업로드 미리보기 확인 후 사용자가 명시적으로 호출.
 * 완료 후 menu_master 자동 동기화.
 * @param {Array<object>} items - parseMenuPriceRows().success
 */
export async function replaceAllMenuPrices(items) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const withCodes = generateMenuCodesForBatch(items || []);
  const records = withCodes.map(buildRecord);
  await runTransaction([STORE], 'readwrite', tx => {
    const store = tx.objectStore(STORE);
    store.clear();
    for (const r of records) store.add(r);
  });
  await _syncAfter(records);
  return { replaced: records.length };
}

function buildRecord(data) {
  return {
    menuCode: (data.menuCode || '').trim(),
    menuName: (data.menuName || '').trim(),
    category: (data.category || '').trim(),
    size: (data.size || '단일').trim(),
    price: data.price != null && data.price !== '' ? Math.round(Number(data.price)) : null,
    note: (data.note || '').trim(),
    updatedAt: new Date().toISOString(),
  };
}
