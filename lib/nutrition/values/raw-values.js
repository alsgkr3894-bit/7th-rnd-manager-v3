/**
 * lib/nutrition/values/raw-values.js — nutrition_raw_values CRUD
 *
 * 베이스 영양성분 원본값(lab 제공), 기준데이터 전체 초기화, 중복 진단·수리를 담당한다.
 * clearAllBaseData는 nutrition_menu_ref도 함께 비우는 복합 작업이므로 여기서 구현한다.
 */
import { getAll, deleteById, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import {
  compactRecordsByKey,
  menuRefKey,
  rawValueKey,
  buildRawValueMapFromRows,
  buildNutritionBaseDuplicateDiagnostics,
} from './dedup';
import { cleanKey, upsertWithTimestamp, upsertUniqueByIndex } from './shared';

export async function getAllRawValues() {
  if (!hasStore('nutrition_raw_values')) return [];
  return getAll('nutrition_raw_values');
}

export async function getRawValueMap() {
  const rows = await getAllRawValues();
  return buildRawValueMapFromRows(rows);
}

export async function upsertRawValue(data) {
  await assertActiveAdmin('영양 기준값 저장');
  const menuCode = cleanKey(data?.menuCode);
  const crustType = cleanKey(data?.crustType);
  if (!menuCode || !crustType) return upsertWithTimestamp('nutrition_raw_values', data);
  return upsertUniqueByIndex('nutrition_raw_values', 'menu_crust', [menuCode, crustType], {
    ...data,
    menuCode,
    crustType,
  });
}

/**
 * 베이스 영양성분 가져오기 저장.
 * menu_ref와 raw_values를 단일 transaction에서 함께 반영해 부분 커밋을 막는다.
 *
 * @param {Array<{menuCode:string, menuName?:string, category?:string, crustType:string, rawValue?:object}>} items
 * @returns {Promise<{menuRefs:number, rawValues:number}>}
 */
export async function bulkUpsertBaseData(items = []) {
  await assertActiveAdmin('영양 기준데이터 일괄 가져오기 저장');
  const stores = ['nutrition_menu_ref', 'nutrition_raw_values'];
  for (const storeName of stores) {
    if (!hasStore(storeName)) throw new Error(`${storeName} store를 찾을 수 없습니다`);
  }

  const inputRows = (Array.isArray(items) ? items : [])
    .map(item => {
      const rawValue = item?.rawValue && typeof item.rawValue === 'object' ? item.rawValue : item;
      const menuCode = cleanKey(item?.menuCode ?? rawValue?.menuCode);
      const crustType = cleanKey(item?.crustType ?? rawValue?.crustType);
      const menuName = cleanKey(item?.menuName ?? rawValue?.menuName);
      const category = cleanKey(item?.category ?? rawValue?.category);
      return { ...item, rawValue, menuCode, crustType, menuName, category };
    })
    .filter(row => row.menuCode && row.crustType);

  if (inputRows.length === 0) return { menuRefs: 0, rawValues: 0 };

  const [existingMenuRefs, existingRawValues] = await Promise.all([
    getAll('nutrition_menu_ref'),
    getAll('nutrition_raw_values'),
  ]);
  const keepMenuByCode = new Map(
    compactRecordsByKey(existingMenuRefs, menuRefKey).map(row => [menuRefKey(row), row])
  );
  const keepRawByKey = new Map(
    compactRecordsByKey(existingRawValues, rawValueKey).map(row => [rawValueKey(row), row])
  );

  const now = new Date().toISOString();
  const menuInputByCode = new Map();
  const rawInputByKey = new Map();
  for (const row of inputRows) {
    menuInputByCode.set(row.menuCode, row);
    rawInputByKey.set(`${row.menuCode}__${row.crustType}`, row);
  }

  const menuRecords = [...menuInputByCode.values()].map(row => {
    const existing = keepMenuByCode.get(row.menuCode);
    return {
      ...(existing || {}),
      menuCode: row.menuCode,
      menuName: row.menuName,
      category: row.category,
      updatedAt: now,
    };
  });

  const rawRecords = [...rawInputByKey.values()].map(row => {
    const existing = keepRawByKey.get(`${row.menuCode}__${row.crustType}`);
    const idPatch =
      existing?.id != null
        ? { id: existing.id }
        : row.rawValue?.id != null
          ? { id: row.rawValue.id }
          : {};
    return {
      ...(existing || {}),
      ...(row.rawValue || {}),
      ...idPatch,
      menuCode: row.menuCode,
      menuName: row.menuName,
      category: row.category,
      crustType: row.crustType,
      updatedAt: now,
    };
  });

  const touchedMenuCodes = new Set(menuInputByCode.keys());
  const touchedRawKeys = new Set(rawInputByKey.keys());
  const menuDeletes = existingMenuRefs.filter(row => {
    const key = menuRefKey(row);
    return (
      key && touchedMenuCodes.has(key) && row.id != null && row.id !== keepMenuByCode.get(key)?.id
    );
  });
  const rawDeletes = existingRawValues.filter(row => {
    const key = rawValueKey(row);
    return key && touchedRawKeys.has(key) && row.id != null && row.id !== keepRawByKey.get(key)?.id;
  });

  await runTransaction(stores, 'readwrite', tx => {
    const menuStore = tx.objectStore('nutrition_menu_ref');
    const rawStore = tx.objectStore('nutrition_raw_values');
    for (const record of menuRecords) menuStore.put(record);
    for (const record of rawRecords) rawStore.put(record);
    for (const record of menuDeletes) menuStore.delete(record.id);
    for (const record of rawDeletes) rawStore.delete(record.id);
  });

  return { menuRefs: menuRecords.length, rawValues: rawRecords.length };
}

export async function deleteRawValue(id) {
  await assertActiveAdmin('영양 기준값 삭제');
  return deleteById('nutrition_raw_values', id);
}

export async function deleteRawValuesByMenuCode(menuCode) {
  await assertActiveAdmin('영양 기준값 메뉴별 삭제');
  if (!hasStore('nutrition_raw_values')) return;
  const rows = await getAll('nutrition_raw_values');
  const targets = rows.filter(r => r.menuCode === menuCode);
  if (!targets.length) return;
  await runTransaction('nutrition_raw_values', 'readwrite', tx => {
    const s = tx.objectStore('nutrition_raw_values');
    targets.forEach(r => s.delete(r.id));
  });
}

/** nutrition_raw_values + nutrition_menu_ref 전체 삭제 */
export async function clearAllBaseData() {
  await assertActiveAdmin('영양 기준데이터 전체 삭제');
  const stores = ['nutrition_raw_values', 'nutrition_menu_ref'].filter(storeName =>
    hasStore(storeName)
  );
  if (stores.length === 0) return;
  await runTransaction(stores, 'readwrite', tx => {
    for (const storeName of stores) {
      tx.objectStore(storeName).clear();
    }
  });
}

export async function getNutritionBaseDuplicateDiagnostics() {
  const [menuRefs, rawValues] = await Promise.all([
    hasStore('nutrition_menu_ref') ? getAll('nutrition_menu_ref') : [],
    hasStore('nutrition_raw_values') ? getAll('nutrition_raw_values') : [],
  ]);
  return buildNutritionBaseDuplicateDiagnostics({ menuRefs, rawValues });
}

export async function repairNutritionBaseDuplicates() {
  await assertActiveAdmin('영양 기준데이터 중복 정리');
  const [menuRefs, rawValues] = await Promise.all([
    hasStore('nutrition_menu_ref') ? getAll('nutrition_menu_ref') : [],
    hasStore('nutrition_raw_values') ? getAll('nutrition_raw_values') : [],
  ]);
  const before = buildNutritionBaseDuplicateDiagnostics({ menuRefs, rawValues });
  if (!before.hasDuplicates) return { before, after: before, removed: 0 };

  await runTransaction(['nutrition_menu_ref', 'nutrition_raw_values'], 'readwrite', tx => {
    const menuStore = tx.objectStore('nutrition_menu_ref');
    const rawStore = tx.objectStore('nutrition_raw_values');
    for (const group of before.menuGroups) {
      for (const id of group.removeIds) menuStore.delete(id);
    }
    for (const group of before.rawGroups) {
      for (const id of group.removeIds) rawStore.delete(id);
    }
  });

  const after = buildNutritionBaseDuplicateDiagnostics({
    menuRefs: compactRecordsByKey(menuRefs, menuRefKey),
    rawValues: compactRecordsByKey(rawValues, rawValueKey),
  });
  return { before, after, removed: before.duplicateRows };
}
