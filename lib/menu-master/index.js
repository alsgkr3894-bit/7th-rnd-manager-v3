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
  getMenuDeletePlan,
  resetAllMenuMaster,
} from './store';

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { assertActiveAdmin } from '@/lib/auth/guard';

export {
  getAllMenuMaster,
  getMenuMasterMap,
  getMenuNameToCodeMap,
  upsertMenuMaster,
  deleteMenuMaster,
  getMenuDeletePlan,
  resetAllMenuMaster,
};

function optionalFinitePrice(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * cost_selling_prices 배열로 menu_master를 동기화.
 * 단가 테이블 CRUD 직후 자동 호출됨.
 * 효율을 위해 기존 마스터를 한 번만 읽고 단일 트랜잭션으로 일괄 처리.
 * 기존 메뉴는 menu_master를 기준으로 삼고 price만 갱신한다.
 * 메뉴명/분류/규격/상태/메모/숨김 같은 운영 필드는 판매가 업로드로 덮지 않는다.
 *
 * @param {object[]} priceRows - cost_selling_prices 의 현재 전체 레코드
 * @returns {Promise<{ synced: number, created: number, priceUpdated: number, unchanged: number, duplicateMenuCodes: string[] }>}
 */
export async function syncMenuMasterFromPrices(priceRows, options = {}) {
  if (!options?.skipAdminGuard) await assertActiveAdmin('메뉴마스터 판매가 동기화');
  const emptyResult = {
    synced: 0,
    created: 0,
    priceUpdated: 0,
    unchanged: 0,
    duplicateMenuCodes: [],
  };
  if (!hasStore('menu_master')) return emptyResult;
  const rows = (priceRows || []).filter(p => p.menuCode);
  if (rows.length === 0) return emptyResult;

  const existing = await getAll('menu_master');
  const masterByCode = new Map(existing.filter(r => r.menuCode).map(r => [r.menuCode, r]));

  // priceRows 내 중복 menuCode 는 마지막 항목만 사용 (unique index 충돌 방지)
  const deduped = new Map();
  const duplicateCodes = new Set();
  for (const p of rows) {
    const code = (p.menuCode || '').trim();
    if (!code) continue;
    if (deduped.has(code)) duplicateCodes.add(code);
    deduped.set(code, p);
  }

  const now = new Date().toISOString();
  let created = 0;
  let priceUpdated = 0;
  let unchanged = 0;
  const toUpsert = [];

  for (const p of deduped.values()) {
    const code = (p.menuCode || '').trim();
    const parsed = parseCategoryFromCode(code);
    const prev = masterByCode.get(code);
    const price = optionalFinitePrice(p.price);
    const size = p.size && p.size !== '단일' ? p.size : null;
    if (prev) {
      const prevPrice = optionalFinitePrice(prev.price);
      const category = (parsed.category || prev.category || p.category || '').trim();
      const subCategory = (parsed.subCategory || prev.subCategory || '').trim();
      if (prevPrice === price && prev.category === category && prev.subCategory === subCategory) {
        unchanged++;
        continue;
      }
      priceUpdated++;
      toUpsert.push({ ...prev, category, subCategory, price, updatedAt: now });
      continue;
    }

    created++;
    const record = {
      menuCode: code,
      menuName: (p.menuName || '').trim(),
      category: (parsed.category || p.category || '').trim(),
      subCategory: parsed.subCategory || '',
      size,
      price,
      status: 'active',
      source: 'price-sync',
      displayOrder: 0,
      note: '',
      updatedAt: now,
    };
    toUpsert.push(record);
  }

  if (toUpsert.length > 0) {
    await runTransaction(['menu_master'], 'readwrite', tx => {
      const store = tx.objectStore('menu_master');
      for (const r of toUpsert) {
        if (r.id != null) store.put(r);
        else store.add(r);
      }
    });
  }

  return {
    synced: created + priceUpdated,
    created,
    priceUpdated,
    unchanged,
    duplicateMenuCodes: [...duplicateCodes],
  };
}

/**
 * 메뉴 마스터 → cost_selling_prices 동기화 (마스터가 메인).
 * price가 있는 항목만 판매가 테이블에 반영.
 * status=discontinued 항목은 판매가 테이블에서 제거.
 *
 * @returns {{ pushed: number, removed: number }}
 */
export async function pushMasterToPrices(options = {}) {
  if (!options?.skipAdminGuard) await assertActiveAdmin('메뉴마스터 판매가 반영');
  if (!hasStore('menu_master') || !hasStore('cost_selling_prices')) {
    return { pushed: 0, removed: 0 };
  }

  const masters = await getAllMenuMaster();
  const priceRows = await getAll('cost_selling_prices');
  const priceMap = new Map(priceRows.filter(r => r.menuCode).map(r => [r.menuCode, r]));

  const now = new Date().toISOString();
  const toPut = [];
  const toAdd = [];
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
      size: m.size || '단일',
      price: m.price,
      note: m.note || '',
      updatedAt: now,
    };
    if (existing) toPut.push({ ...existing, ...record });
    else toAdd.push(record);
  }

  if (toPut.length + toAdd.length + toDelete.length > 0) {
    await runTransaction(['cost_selling_prices'], 'readwrite', tx => {
      const store = tx.objectStore('cost_selling_prices');
      for (const r of toPut) store.put(r);
      for (const r of toAdd) store.add(r);
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
  await assertActiveAdmin('판매가 메뉴마스터 가져오기');
  if (!hasStore('cost_selling_prices')) return { imported: 0 };
  const prices = await getAll('cost_selling_prices');
  let imported = 0;
  for (const p of prices) {
    if (!p.menuCode) continue;
    await upsertMenuMaster(
      {
        menuCode: p.menuCode,
        menuName: p.menuName,
        category: p.category || '',
        size: p.size !== '단일' ? p.size : null,
        price: p.price,
        status: 'active',
        source: 'price-import',
      },
      { skipAdminGuard: true }
    );
    imported++;
  }
  return { imported };
}
