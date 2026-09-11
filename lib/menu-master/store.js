/**
 * lib/menu-master/store.js — menu_master CRUD
 *
 * 레코드 구조:
 *   id           autoIncrement PK
 *   menuCode     'PZ-001-L' 등 (unique)
 *   menuName     '슈퍼콤비네이션'
 *   category     '피자' | '1인피자' | '사이드' | '세트박스'
 *   size         'L' | 'R' | null (단일 규격 메뉴는 null)
 *   status       'active' | 'discontinued' | 'test'
 *   displayOrder 정렬 순서 (정수)
 *   note         비고
 *   updatedAt    ISO
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import { getMenuCodeBase } from './code-policy';

const STORE = 'menu_master';
const LINKED_MENU_CODE_STORES = [
  'cost_selling_prices',
  'menu_recipes',
  'nutrition_menu_ref',
  'nutrition_raw_values',
];
const MENU_SIZE_ORDER = { L: 0, R: 1 };
const s = tx => tx.objectStore(STORE);

function optionalFinitePrice(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function getAllMenuMaster() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => {
    const ra = getMenuCodeRank(a.menuCode);
    const rb = getMenuCodeRank(b.menuCode);
    if (ra !== rb) return ra - rb;
    const ba = getMenuCodeBase(a) || a.menuCode || '';
    const bb = getMenuCodeBase(b) || b.menuCode || '';
    if (ba !== bb) {
      const da = a.displayOrder ?? 999;
      const db = b.displayOrder ?? 999;
      if (da !== db) return da - db;
      return ba.localeCompare(bb, 'ko', { numeric: true });
    }
    const sa = getMenuSizeOrder(a.size);
    const sb = getMenuSizeOrder(b.size);
    if (sa !== sb) return sa - sb;
    const da = a.displayOrder ?? 999;
    const db = b.displayOrder ?? 999;
    if (da !== db) return da - db;
    return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
  });
}

function getMenuSizeOrder(size) {
  const key = String(size || '')
    .trim()
    .toUpperCase();
  if (key in MENU_SIZE_ORDER) return MENU_SIZE_ORDER[key];
  return 9;
}

/** menuCode → record Map */
export async function getMenuMasterMap() {
  const rows = await getAllMenuMaster();
  return new Map(rows.filter(r => r.menuCode).map(r => [r.menuCode, r]));
}

/**
 * menuName → menuCode 역방향 맵 (판매량 분류 매칭용).
 * 키: menuName (단일 사이즈) 또는 "menuName:size" (복수 사이즈).
 */
export async function getMenuNameToCodeMap() {
  const rows = await getAllMenuMaster();
  const map = new Map();
  for (const r of rows) {
    if (!r.menuCode) continue;
    if (r.size) {
      map.set(`${r.menuName}:${r.size}`, r.menuCode);
    } else {
      map.set(r.menuName, r.menuCode);
    }
  }
  return map;
}

export async function upsertMenuMaster(data, options = {}) {
  if (!options?.skipAdminGuard) await assertActiveAdmin('메뉴마스터 저장');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  if (!data.menuCode) throw new Error('menuCode가 필요합니다');
  // 이름 없는 메뉴는 name→code 매칭(판매량 분류)을 오염시키므로 store 경계에서 차단
  if (!String(data.menuName || '').trim()) throw new Error('menuName이 필요합니다');

  const all = await getAll(STORE);

  if (data.id) {
    const existing = all.find(r => String(r.id) === String(data.id));
    if (!existing) throw new Error('항목을 찾을 수 없습니다');
    const next = { ...existing, ...buildRecord(data), id: existing.id };
    const dup = all.find(r => r.menuCode === next.menuCode && String(r.id) !== String(existing.id));
    if (dup) throw new Error('이미 같은 menuCode가 있습니다');

    const menuCodeChanged = existing.menuCode !== next.menuCode;
    const cascade = menuCodeChanged
      ? await collectLinkedMenuCodeRows(existing.menuCode, next.menuCode)
      : { stores: [], rowsByStore: {} };

    await runTransaction([STORE, ...cascade.stores], 'readwrite', tx => {
      s(tx).put(next);
      if (menuCodeChanged) {
        putLinkedMenuCodeRows(tx, cascade.rowsByStore, next);
      }
    });
    return {
      id: existing.id,
      mode: 'update',
      previous: { menuName: existing.menuName, price: existing.price ?? null },
      cascadedMenuCode: menuCodeChanged
        ? {
            from: existing.menuCode,
            to: next.menuCode,
            updated: countRowsByStore(cascade.rowsByStore),
          }
        : null,
    };
  }

  const dup = all.find(r => r.menuCode === data.menuCode);
  if (dup) {
    await runTransaction([STORE], 'readwrite', tx => {
      s(tx).put({ ...dup, ...buildRecord(data), id: dup.id });
    });
    return {
      id: dup.id,
      mode: 'update',
      previous: { menuName: dup.menuName, price: dup.price ?? null },
    };
  }

  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = s(tx).add(buildRecord(data));
    req.onsuccess = () => {
      insertedId = req.result;
    };
  });
  return { id: insertedId, mode: 'insert' };
}

export async function deleteMenuMaster(id) {
  await assertActiveAdmin('메뉴마스터 삭제');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const target = all.find(r => r.id === id);
  const menuCode = target?.menuCode;

  const cascadeStores = [STORE];
  for (const storeName of LINKED_MENU_CODE_STORES) {
    if (!menuCode || !hasStore(storeName)) continue;
    cascadeStores.push(storeName);
  }

  // 연결 행을 트랜잭션 "안"에서 menuCode로 재조회·삭제한다. 트랜잭션 밖에서 수집 후
  // 삭제하면 수집~삭제 사이에 같은 menuCode로 추가된 행이 고아로 남는 갭이 생긴다.
  await runTransaction(cascadeStores, 'readwrite', tx => {
    s(tx).delete(id);
    if (!menuCode) return;
    for (const storeName of cascadeStores) {
      if (storeName === STORE) continue;
      const st = tx.objectStore(storeName);
      const req = st.getAll();
      req.onsuccess = () => {
        for (const row of req.result) {
          if (row && row.menuCode === menuCode && row.id != null) st.delete(row.id);
        }
      };
    }
  });

  return { cascadeErrors: [] };
}

export async function getMenuDeletePlan(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const target = all.find(row => String(row.id) === String(id));
  if (!target) return null;
  const menuCode = target.menuCode;
  const linkedCounts = {};
  let totalLinkedRows = 0;

  for (const storeName of LINKED_MENU_CODE_STORES) {
    if (!menuCode || !hasStore(storeName)) {
      linkedCounts[storeName] = 0;
      continue;
    }
    const rows = await getAll(storeName);
    const count = rows.filter(row => row.menuCode === menuCode && row.id != null).length;
    linkedCounts[storeName] = count;
    totalLinkedRows += count;
  }

  return {
    menu: target,
    menuCode,
    linkedCounts,
    totalLinkedRows,
  };
}

/**
 * status만 직접 patch한다 — buildRecord(전체 화이트리스트 조립)를 거치지 않으므로
 * price 등 안 넘긴 필드가 null로 덮어써지는 사고를 피한다(upsertMenuMaster의 update
 * 분기는 매번 buildRecord 전체를 재조립해 병합하기 때문에 status 하나만 바꾸려고
 * 호출하면 price가 undefined→null로 날아간다).
 */
export async function setMenuMasterStatus(id, status) {
  await assertActiveAdmin('메뉴마스터 상태 변경');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('항목을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).put({ ...existing, status, updatedAt: new Date().toISOString() });
  });
}

/** 여러 건의 status를 한 트랜잭션으로 일괄 변경. */
export async function setMenuMasterStatusMany(ids, status) {
  await assertActiveAdmin('메뉴마스터 상태 일괄 변경');
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const safeIds = new Set((Array.isArray(ids) ? ids : []).filter(id => id != null));
  if (safeIds.size === 0) return { updated: 0 };
  const all = await getAll(STORE);
  const now = new Date().toISOString();
  let updated = 0;
  await runTransaction([STORE], 'readwrite', tx => {
    const store = s(tx);
    for (const row of all) {
      if (!safeIds.has(row.id)) continue;
      store.put({ ...row, status, updatedAt: now });
      updated++;
    }
  });
  return { updated };
}

export async function resetAllMenuMaster() {
  await assertActiveAdmin('메뉴마스터 전체 초기화');
  if (!hasStore(STORE)) return { deleted: 0 };
  const all = await getAll(STORE);
  const count = all.length;
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).clear();
  });
  return { deleted: count };
}

function buildRecord(data) {
  const code = (data.menuCode || '').trim();
  const parsed = parseCategoryFromCode(code);
  const category = (parsed.category || data.category || '').trim();
  const subCategory = (parsed.subCategory || data.subCategory || '').trim();
  const price = optionalFinitePrice(data.price);

  const rec = {
    menuCode: code,
    menuName: (data.menuName || '').trim(),
    category,
    subCategory,
    size: data.size ? String(data.size).trim() : null,
    price, // 판매가 (마스터 기준)
    status: data.status || 'active',
    source: data.source || undefined,
    displayOrder: data.displayOrder ?? 0,
    note: (data.note || '').trim(),
    updatedAt: new Date().toISOString(),
  };
  // 토글 필드는 명시됐을 때만 반영 — 시드/부분 동기화가 사용자 설정을 덮어쓰지 않도록
  // (update 경로 { ...existing, ...buildRecord } 에서 키가 없으면 기존값 보존)
  if (data.hidden !== undefined) rec.hidden = data.hidden === true;
  if (data.excludeFromOrigin !== undefined) rec.excludeFromOrigin = data.excludeFromOrigin === true;
  // photo: { data: base64 dataURL, name } | null. 단일 슬롯(완성 사진 1장).
  if (data.photo !== undefined) rec.photo = data.photo && data.photo.data ? data.photo : null;
  return rec;
}

async function collectLinkedMenuCodeRows(fromMenuCode, toMenuCode) {
  const stores = [];
  const rowsByStore = {};
  if (!fromMenuCode || !toMenuCode || fromMenuCode === toMenuCode) {
    return { stores, rowsByStore };
  }

  for (const storeName of LINKED_MENU_CODE_STORES) {
    if (!hasStore(storeName)) continue;
    stores.push(storeName);
    const rows = await getAll(storeName);
    const conflicts = rows.filter(row => row.menuCode === toMenuCode && row.id != null);
    if (conflicts.length > 0) {
      throw new Error(`연결 데이터에 같은 menuCode가 이미 있습니다: ${storeName}`);
    }
    rowsByStore[storeName] = rows.filter(row => row.menuCode === fromMenuCode && row.id != null);
  }
  return { stores, rowsByStore };
}

function putLinkedMenuCodeRows(tx, rowsByStore, menuRecord) {
  for (const [storeName, rows] of Object.entries(rowsByStore)) {
    if (!rows.length) continue;
    const store = tx.objectStore(storeName);
    for (const row of rows) {
      store.put(buildLinkedMenuCodeRecord(row, menuRecord));
    }
  }
}

function buildLinkedMenuCodeRecord(row, menuRecord) {
  const next = { ...row, menuCode: menuRecord.menuCode, updatedAt: menuRecord.updatedAt };
  if ('menuName' in row) next.menuName = menuRecord.menuName || row.menuName;
  if ('category' in row) next.category = menuRecord.category || row.category;
  if ('size' in row) next.size = menuRecord.size || row.size;
  // menu_recipes는 kind로 카테고리 버킷을 구분한다(recipeKindForRecord가 저장된 kind를
  // category보다 우선함) — category가 바뀌었는데 kind를 안 갱신하면 stale kind로 엉뚱한
  // 버킷(all-summary, 평균 원가율 등)에 계속 남는다.
  if ('kind' in row) next.kind = recipeStoreKindForCategory(next.category) || row.kind;
  return next;
}

function countRowsByStore(rowsByStore) {
  return Object.fromEntries(
    Object.entries(rowsByStore).map(([storeName, rows]) => [storeName, rows.length])
  );
}
