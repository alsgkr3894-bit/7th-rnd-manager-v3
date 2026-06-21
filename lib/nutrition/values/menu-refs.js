/**
 * lib/nutrition/values/menu-refs.js — nutrition_menu_ref CRUD
 *
 * 메뉴 목록 조회·추가·삭제. cascade 삭제 시 raw-values의 deleteRawValuesByMenuCode를 호출한다.
 */
import { getAll, deleteById, runTransaction, hasStore } from '@/lib/db';
import { compactRecordsByKey, menuRefKey } from './dedup';
import { cleanKey, byDisplayOrder, upsertWithTimestamp, upsertUniqueByIndex } from './shared';

export async function getAllMenuRefs() {
  if (!hasStore('nutrition_menu_ref')) return [];
  const rows = await getAll('nutrition_menu_ref');
  return compactRecordsByKey(rows, menuRefKey).sort(byDisplayOrder);
}

export async function upsertMenuRef(data) {
  const menuCode = cleanKey(data?.menuCode);
  if (!menuCode) return upsertWithTimestamp('nutrition_menu_ref', data);
  return upsertUniqueByIndex('nutrition_menu_ref', 'menuCode', menuCode, {
    ...data,
    menuCode,
  });
}

/**
 * nutrition_menu_ref 단건 삭제 + cascade:
 *   - nutrition_raw_values (deleteRawValuesByMenuCode 위임)
 */
export async function deleteMenuRef(id, menuCode) {
  if (!menuCode) {
    await deleteById('nutrition_menu_ref', id);
    return;
  }
  // menu_ref(해당 id) + raw_values(menuCode 일치)를 단일 트랜잭션으로 원자 삭제한다.
  // 이전엔 deleteById 후 별도 트랜잭션으로 raw_values를 지워 중간 실패 시 raw orphan이 남았다.
  const hasRaw = hasStore('nutrition_raw_values');
  const rawTargets = hasRaw
    ? (await getAll('nutrition_raw_values')).filter(r => r.menuCode === menuCode && r.id != null)
    : [];
  const stores = ['nutrition_menu_ref', ...(hasRaw ? ['nutrition_raw_values'] : [])];
  await runTransaction(stores, 'readwrite', tx => {
    tx.objectStore('nutrition_menu_ref').delete(id);
    if (hasRaw) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      rawTargets.forEach(r => rawStore.delete(r.id));
    }
  });
}

/** menuCode 기준 menu_ref + raw_values cascade 삭제 — 단일 다중스토어 트랜잭션(원자적). */
export async function deleteMenuRefsByMenuCode(menuCode) {
  if (!menuCode) return;
  const hasMenuRefStore = hasStore('nutrition_menu_ref');
  const hasRawValueStore = hasStore('nutrition_raw_values');
  if (!hasMenuRefStore && !hasRawValueStore) return;

  const [refs, rawValues] = await Promise.all([
    hasMenuRefStore ? getAll('nutrition_menu_ref') : [],
    hasRawValueStore ? getAll('nutrition_raw_values') : [],
  ]);
  const refTargets = refs.filter(r => r.menuCode === menuCode && r.id != null);
  const rawTargets = rawValues.filter(r => r.menuCode === menuCode && r.id != null);
  if (refTargets.length + rawTargets.length === 0) return;

  const stores = [
    ...(hasMenuRefStore ? ['nutrition_menu_ref'] : []),
    ...(hasRawValueStore ? ['nutrition_raw_values'] : []),
  ];
  await runTransaction(stores, 'readwrite', tx => {
    if (hasMenuRefStore) {
      const menuStore = tx.objectStore('nutrition_menu_ref');
      refTargets.forEach(r => menuStore.delete(r.id));
    }
    if (hasRawValueStore) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      rawTargets.forEach(r => rawStore.delete(r.id));
    }
  });
}

/** 메뉴마스터 밖 orphan 영양 메뉴 ref + raw_values 일괄 정리 */
export async function deleteMenuRefsByMenuCodes(menuCodes = []) {
  const codeSet = new Set(
    (Array.isArray(menuCodes) ? menuCodes : []).map(cleanKey).filter(Boolean)
  );
  if (codeSet.size === 0) return { deletedMenuRefs: 0, deletedRawValues: 0 };

  const hasMenuRefStore = hasStore('nutrition_menu_ref');
  const hasRawValueStore = hasStore('nutrition_raw_values');
  if (!hasMenuRefStore && !hasRawValueStore) {
    return { deletedMenuRefs: 0, deletedRawValues: 0 };
  }

  const [refs, rawValues] = await Promise.all([
    hasMenuRefStore ? getAll('nutrition_menu_ref') : [],
    hasRawValueStore ? getAll('nutrition_raw_values') : [],
  ]);
  const refTargets = refs.filter(row => codeSet.has(cleanKey(row.menuCode)) && row.id != null);
  const rawTargets = rawValues.filter(row => codeSet.has(cleanKey(row.menuCode)) && row.id != null);
  if (refTargets.length + rawTargets.length === 0) {
    return { deletedMenuRefs: 0, deletedRawValues: 0 };
  }

  const stores = [
    ...(hasMenuRefStore ? ['nutrition_menu_ref'] : []),
    ...(hasRawValueStore ? ['nutrition_raw_values'] : []),
  ];
  await runTransaction(stores, 'readwrite', tx => {
    if (hasMenuRefStore) {
      const menuStore = tx.objectStore('nutrition_menu_ref');
      refTargets.forEach(row => menuStore.delete(row.id));
    }
    if (hasRawValueStore) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      rawTargets.forEach(row => rawStore.delete(row.id));
    }
  });

  return {
    deletedMenuRefs: refTargets.length,
    deletedRawValues: rawTargets.length,
  };
}
