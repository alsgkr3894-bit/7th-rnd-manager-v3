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
  const menuCode = cleanKey(data?.menuCode);
  const crustType = cleanKey(data?.crustType);
  if (!menuCode || !crustType) return upsertWithTimestamp('nutrition_raw_values', data);
  return upsertUniqueByIndex('nutrition_raw_values', 'menu_crust', [menuCode, crustType], {
    ...data,
    menuCode,
    crustType,
  });
}

export async function deleteRawValue(id) {
  return deleteById('nutrition_raw_values', id);
}

export async function deleteRawValuesByMenuCode(menuCode) {
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
  for (const storeName of ['nutrition_raw_values', 'nutrition_menu_ref']) {
    if (!hasStore(storeName)) continue;
    await runTransaction(storeName, 'readwrite', tx => {
      tx.objectStore(storeName).clear();
    });
  }
}

export async function getNutritionBaseDuplicateDiagnostics() {
  const [menuRefs, rawValues] = await Promise.all([
    hasStore('nutrition_menu_ref') ? getAll('nutrition_menu_ref') : [],
    hasStore('nutrition_raw_values') ? getAll('nutrition_raw_values') : [],
  ]);
  return buildNutritionBaseDuplicateDiagnostics({ menuRefs, rawValues });
}

export async function repairNutritionBaseDuplicates() {
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
