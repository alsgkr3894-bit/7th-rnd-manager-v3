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
import { getMenuCodeRank } from '@/lib/menu-categories';
import { assertActiveAdmin } from '@/lib/auth/guard';

const STORE = 'cost_selling_prices';
const s = tx => tx.objectStore(STORE);

function optionalRoundedPrice(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

async function _syncAfter(rows) {
  try {
    return await syncMenuMasterFromPrices(rows, { skipAdminGuard: true });
  } catch (err) {
    const message = err?.message || String(err);
    console.error('[menu-master sync]', err);
    return {
      synced: 0,
      created: 0,
      priceUpdated: 0,
      unchanged: 0,
      duplicateMenuCodes: [],
      error: `메뉴마스터 동기화 실패: ${message}`,
    };
  }
}

export async function getAllMenuPrices() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => {
    const ra = getMenuCodeRank(a.menuCode);
    const rb = getMenuCodeRank(b.menuCode);
    if (ra !== rb) return ra - rb;
    const na = a.menuName || '',
      nb = b.menuName || '';
    if (na !== nb) return na.localeCompare(nb, 'ko');
    return (a.size || '').localeCompare(b.size || '', 'ko');
  });
}

export async function addMenuPrice(data) {
  await assertActiveAdmin('판매가 추가');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const existing = await getAll(STORE);
  const menuCode = data.menuCode || generateMenuCode(data, existing);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).add(buildRecord({ ...data, menuCode }));
  });
  const allAfter = await getAll(STORE);
  const sync = await _syncAfter(allAfter);
  return { menuCode, sync };
}

export async function updateMenuPrice(id, data) {
  await assertActiveAdmin('판매가 수정');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('항목을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).put({ ...existing, ...buildRecord(data), id });
  });
  const allAfter = await getAll(STORE);
  const sync = await _syncAfter(allAfter);
  return { sync };
}

export async function deleteMenuPrice(id) {
  await assertActiveAdmin('판매가 삭제');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });
  const allAfter = await getAll(STORE);
  const sync = await _syncAfter(allAfter);
  return { sync };
}

/** 전체 초기화 (업로드 일괄 교체 전 호출) */
export async function resetAllMenuPrices() {
  await assertActiveAdmin('판매가 전체 초기화');
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
  await assertActiveAdmin('판매가 일괄 교체');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const withCodes = generateMenuCodesForBatch(items || []);
  const records = withCodes.map(buildRecord);
  await runTransaction([STORE], 'readwrite', tx => {
    const store = tx.objectStore(STORE);
    store.clear();
    for (const r of records) store.add(r);
  });
  const sync = await _syncAfter(records);
  return { replaced: records.length, sync };
}

export async function previewMenuPriceReplacement(items) {
  const records = generateMenuCodesForBatch(items || []).map(buildRecord);
  if (!hasStore(STORE)) {
    return {
      existing: 0,
      replacement: records.length,
      retained: 0,
      created: records.length,
      removed: 0,
    };
  }
  const existing = await getAll(STORE);
  const existingCodes = new Set(existing.map(row => (row.menuCode || '').trim()).filter(Boolean));
  const nextCodes = new Set(records.map(row => (row.menuCode || '').trim()).filter(Boolean));
  const retained = [...nextCodes].filter(code => existingCodes.has(code)).length;
  const created = records.filter(row => !existingCodes.has((row.menuCode || '').trim())).length;
  const removed = existing.filter(row => !nextCodes.has((row.menuCode || '').trim())).length;
  return {
    existing: existing.length,
    replacement: records.length,
    retained,
    created,
    removed,
  };
}

function buildRecord(data) {
  return {
    menuCode: (data.menuCode || '').trim(),
    menuName: (data.menuName || '').trim(),
    category: (data.category || '').trim(),
    size: (data.size || '단일').trim(),
    price: optionalRoundedPrice(data.price),
    note: (data.note || '').trim(),
    updatedAt: new Date().toISOString(),
  };
}
