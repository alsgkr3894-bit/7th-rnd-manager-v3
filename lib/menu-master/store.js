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
    const existing = all.find(r => r.id === data.id);
    if (!existing) throw new Error('항목을 찾을 수 없습니다');
    await runTransaction([STORE], 'readwrite', tx => {
      s(tx).put({ ...existing, ...buildRecord(data), id: data.id });
    });
    return { id: data.id, mode: 'update' };
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
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });

  const menuCode = target?.menuCode;
  if (!menuCode) return;

  // cascade: 판매가 mirror (cost_selling_prices) — pushMasterToPrices는 discontinued만 제거하므로 직접 삭제
  if (hasStore('cost_selling_prices')) {
    const prices = await getAll('cost_selling_prices');
    const ids = prices.filter(r => r.menuCode === menuCode).map(r => r.id);
    if (ids.length) {
      await runTransaction(['cost_selling_prices'], 'readwrite', tx => {
        const st = tx.objectStore('cost_selling_prices');
        ids.forEach(pid => st.delete(pid));
      });
    }
  }

  // cascade: 원가 레시피 (cost_recipes)
  if (hasStore('cost_recipes')) {
    const recipes = await getAll('cost_recipes');
    const ids = recipes.filter(r => r.menuCode === menuCode).map(r => r.id);
    if (ids.length) {
      await runTransaction(['cost_recipes'], 'readwrite', tx => {
        const st = tx.objectStore('cost_recipes');
        ids.forEach(rid => st.delete(rid));
      });
    }
  }

  // cascade: 영양 참조 (nutrition_menu_ref + nutrition_raw_values)
  await import('@/lib/nutrition/values/store')
    .then(m => m.deleteMenuRefsByMenuCode(menuCode))
    .catch(() => {});
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
