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

const STORE = 'menu_master';
const LINKED_MENU_CODE_STORES = [
  'cost_selling_prices',
  'menu_recipes',
  'nutrition_menu_ref',
  'nutrition_raw_values',
];
const s = tx => tx.objectStore(STORE);

export async function getAllMenuMaster() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => {
    const ra = getMenuCodeRank(a.menuCode);
    const rb = getMenuCodeRank(b.menuCode);
    if (ra !== rb) return ra - rb;
    const da = a.displayOrder ?? 999;
    const db = b.displayOrder ?? 999;
    if (da !== db) return da - db;
    return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
  });
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

export async function upsertMenuMaster(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  if (!data.menuCode) throw new Error('menuCode가 필요합니다');

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
    return { id: dup.id, mode: 'update' };
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
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const target = all.find(r => r.id === id);
  const menuCode = target?.menuCode;

  const cascadeStores = [STORE];
  const idsByStore = {};
  for (const storeName of LINKED_MENU_CODE_STORES) {
    if (!menuCode || !hasStore(storeName)) continue;
    const rows = await getAll(storeName);
    const ids = rows.filter(r => r.menuCode === menuCode).map(r => r.id).filter(v => v != null);
    if (ids.length > 0) idsByStore[storeName] = ids;
    cascadeStores.push(storeName);
  }

  await runTransaction(cascadeStores, 'readwrite', tx => {
    s(tx).delete(id);
    for (const [storeName, ids] of Object.entries(idsByStore)) {
      const st = tx.objectStore(storeName);
      ids.forEach(rowId => st.delete(rowId));
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

export async function resetAllMenuMaster() {
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
  const category = (data.category || parsed.category || '').trim();
  const subCategory = (data.subCategory || parsed.subCategory || '').trim();
  const price = data.price != null && data.price !== '' ? Number(data.price) : null;

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
  return next;
}

function countRowsByStore(rowsByStore) {
  return Object.fromEntries(
    Object.entries(rowsByStore).map(([storeName, rows]) => [storeName, rows.length])
  );
}
