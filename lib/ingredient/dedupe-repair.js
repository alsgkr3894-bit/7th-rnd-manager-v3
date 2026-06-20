/**
 * lib/ingredient/dedupe-repair.js — 제품코드 중복 진단 및 수리
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import {
  recordsByProductCode,
  compareIngredientKeep,
  buildIngredientProductCodeDuplicateDiagnostics,
} from './product-code';
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';
import { normalizeTags, readTags } from './normalize';

function firstPresent(rows, key) {
  for (const row of rows) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function mergeDuplicateIngredientRecord(keep, removeRows, now) {
  const rows = [keep, ...removeRows];
  const merged = { ...keep, updatedAt: now };
  const fillKeys = [
    'ingredientName', 'category', 'manufacturer', 'baseQuantity', 'baseUnitType',
    'taxType', 'priceOverride', 'supplierId', 'supplierName', 'temperature',
    'scope', 'note', 'origin', 'photos', 'photo',
  ];
  for (const key of fillKeys) {
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
      const value = firstPresent(rows, key);
      if (value !== undefined) merged[key] = value;
    }
  }
  merged.tags = [...new Set(rows.flatMap(row => normalizeTags(row?.tags ?? readTags(row))))];
  merged.allergens = [
    ...new Set(rows.flatMap(row => (Array.isArray(row?.allergens) ? row.allergens : []))),
  ];
  merged.photos = normalizeIngredientPhotos(merged.photos, merged.photo);
  merged.photo = getPrimaryIngredientPhoto(merged);
  merged.isManual = rows.some(row => row?.isManual === true);
  merged.isSeeded = rows.some(row => row?.isSeeded === true);
  merged.excluded = keep.excluded === true;
  merged.discontinued = keep.discontinued === true;
  delete merged.categories;
  return merged;
}

export async function getIngredientProductCodeDuplicateDiagnostics() {
  if (!hasStore('cost_ingredients')) {
    return buildIngredientProductCodeDuplicateDiagnostics();
  }
  const rows = await getAll('cost_ingredients');
  return buildIngredientProductCodeDuplicateDiagnostics(rows);
}

export async function repairIngredientProductCodeDuplicates() {
  await assertActiveAdmin('식자재 중복코드 정리');
  if (!hasStore('cost_ingredients')) {
    const empty = buildIngredientProductCodeDuplicateDiagnostics();
    return { before: empty, after: empty, removed: 0 };
  }
  const rows = await getAll('cost_ingredients');
  const before = buildIngredientProductCodeDuplicateDiagnostics(rows);
  if (!before.hasDuplicates) return { before, after: before, removed: 0 };

  const grouped = recordsByProductCode(rows);
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = tx.objectStore('cost_ingredients');
    for (const group of before.groups) {
      const items = [...(grouped.get(group.key) || [])].sort(compareIngredientKeep);
      const keep = items[0];
      const remove = items.slice(1);
      if (!keep || !remove.length) continue;
      st.put(mergeDuplicateIngredientRecord(keep, remove, now));
      remove.forEach(row => {
        if (row.id != null) st.delete(row.id);
      });
    }
  });

  const compacted = [];
  const removeIds = new Set(before.groups.flatMap(group => group.removeIds));
  for (const group of before.groups) {
    const items = [...(grouped.get(group.key) || [])].sort(compareIngredientKeep);
    if (items[0]) compacted.push(mergeDuplicateIngredientRecord(items[0], items.slice(1), now));
  }
  for (const row of rows) {
    if (removeIds.has(row.id)) continue;
    if (before.groups.some(group => group.keepId === row.id)) continue;
    compacted.push(row);
  }
  const after = buildIngredientProductCodeDuplicateDiagnostics(compacted);
  return { before, after, removed: before.duplicateRows };
}

export async function getIngredientHealthSummary() {
  if (!hasStore('cost_ingredients')) return { noPriceCount: 0, total: 0 };
  const rows = await getAll('cost_ingredients');
  const active = rows.filter(r => !r.discontinued && !r.excluded);
  return {
    noPriceCount: active.filter(r => r.unitPrice == null).length,
    total: active.length,
  };
}
