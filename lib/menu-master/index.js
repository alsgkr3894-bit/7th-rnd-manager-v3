/**
 * lib/menu-master/index.js
 *
 * 메뉴 마스터가 모든 모듈의 메인 데이터 소스.
 * 흐름: 메뉴 마스터 → cost_selling_prices (단방향)
 *
 * 다른 모듈은 menuCode를 키로 마스터를 참조.
 */

import {
  getAllMenuMaster,
  getMenuMasterMap,
  getMenuNameToCodeMap,
  upsertMenuMaster,
  deleteMenuMaster,
  resetAllMenuMaster,
} from './store';

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';

export {
  getAllMenuMaster,
  getMenuMasterMap,
  getMenuNameToCodeMap,
  upsertMenuMaster,
  deleteMenuMaster,
  resetAllMenuMaster,
};

/**
 * cost_selling_prices 배열로 menu_master를 동기화.
 * 단가 테이블 CRUD 직후 자동 호출됨.
 * 효율을 위해 기존 마스터를 한 번만 읽고 단일 트랜잭션으로 일괄 처리.
 *
 * @param {object[]} priceRows - cost_selling_prices 의 현재 전체 레코드
 * @returns {Promise<{ synced: number }>}
 */
export async function syncMenuMasterFromPrices(priceRows) {
  if (!hasStore('menu_master')) return { synced: 0 };
  const rows = (priceRows || []).filter(p => p.menuCode);
  if (rows.length === 0) return { synced: 0 };

  const existing = await getAll('menu_master');
  const masterByCode = new Map(existing.filter(r => r.menuCode).map(r => [r.menuCode, r]));

  // priceRows 내 중복 menuCode 는 마지막 항목만 사용 (unique index 충돌 방지)
  const deduped = new Map();
  for (const p of rows) deduped.set(p.menuCode, p);

  const toUpsert = [...deduped.values()].map(p => {
    const code   = (p.menuCode || '').trim();
    const parsed = parseCategoryFromCode(code);
    const prev   = masterByCode.get(code);
    const price  = p.price != null && p.price !== '' ? Number(p.price) : null;
    const size   = p.size && p.size !== '단일' ? p.size : null;
    const record = {
      menuCode:     code,
      menuName:     (p.menuName || '').trim(),
      category:     (p.category || parsed.category || '').trim(),
      subCategory:  prev?.subCategory || parsed.subCategory || '',
      size,
      price,
      status:       prev?.status || 'active',
      source:       prev?.source || 'price-sync',
      displayOrder: prev?.displayOrder ?? 0,
      note:         prev?.note || '',
      updatedAt:    new Date().toISOString(),
    };
    if (prev) return { ...prev, ...record, id: prev.id };
    return record;
  });

  await runTransaction(['menu_master'], 'readwrite', tx => {
    const store = tx.objectStore('menu_master');
    for (const r of toUpsert) {
      if (r.id != null) store.put(r); else store.add(r);
    }
  });

  return { synced: toUpsert.length };
}

/**
 * 메뉴 마스터 → cost_selling_prices 동기화 (마스터가 메인).
 * price가 있는 항목만 판매가 테이블에 반영.
 * status=discontinued 항목은 판매가 테이블에서 제거.
 *
 * @returns {{ pushed: number, removed: number }}
 */
export async function pushMasterToPrices() {
  if (!hasStore('menu_master') || !hasStore('cost_selling_prices')) {
    return { pushed: 0, removed: 0 };
  }

  const masters   = await getAllMenuMaster();
  const priceRows = await getAll('cost_selling_prices');
  const priceMap  = new Map(priceRows.filter(r => r.menuCode).map(r => [r.menuCode, r]));

  const now = new Date().toISOString();
  const toPut    = [];
  const toAdd    = [];
  const toDelete = [];

  for (const m of masters) {
    if (!m.menuCode) continue;

    if (m.status === 'discontinued') {
      const existing = priceMap.get(m.menuCode);
      if (existing) toDelete.push(existing.id);
      continue;
    }

    const existing = priceMap.get(m.menuCode);
    const record = {
      menuCode: m.menuCode,
      menuName: m.menuName,
      category: m.category || '',
      size:     m.size || '단일',
      price:    m.price,
      note:     m.note || '',
      updatedAt: now,
    };
    if (existing) toPut.push({ ...existing, ...record });
    else toAdd.push(record);
  }

  if (toPut.length + toAdd.length + toDelete.length > 0) {
    await runTransaction(['cost_selling_prices'], 'readwrite', tx => {
      const store = tx.objectStore('cost_selling_prices');
      for (const r of toPut)    store.put(r);
      for (const r of toAdd)    store.add(r);
      for (const id of toDelete) store.delete(id);
    });
  }

  return { pushed: toPut.length + toAdd.length, removed: toDelete.length };
}

/**
 * [레거시 / 일회성 가져오기]
 * cost_selling_prices → menu_master 로 가격 정보를 역으로 임포트.
 * 기존 판매가 데이터를 마스터에 병합할 때 한 번만 사용.
 */
export async function importPricesToMaster() {
  if (!hasStore('cost_selling_prices')) return { imported: 0 };
  const prices = await getAll('cost_selling_prices');
  let imported = 0;
  for (const p of prices) {
    if (!p.menuCode) continue;
    await upsertMenuMaster({
      menuCode: p.menuCode,
      menuName: p.menuName,
      category: p.category || '',
      size:     p.size !== '단일' ? p.size : null,
      price:    p.price,
      status:   'active',
      source:   'price-import',
    });
    imported++;
  }
  return { imported };
}
