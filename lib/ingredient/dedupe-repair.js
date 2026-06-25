/**
 * lib/ingredient/dedupe-repair.js — 제품코드 중복 진단 및 수리
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { resolveCompositePrice } from '@/lib/cost/composite-price';
import {
  recordsByProductCode,
  compareIngredientKeep,
  buildIngredientProductCodeDuplicateDiagnostics,
} from './product-code';
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';
import { normalizeTags, readTags } from './normalize';
import { countMissingIngredientPackagePrices } from './price-status';

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
    'ingredientName',
    'category',
    'manufacturer',
    'baseQuantity',
    'baseUnitType',
    'taxType',
    'priceOverride',
    'supplierId',
    'supplierName',
    'temperature',
    'scope',
    'note',
    'origin',
    'photos',
    'photo',
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
  const priceRowMap = await getLatestPriceRowMap();
  const active = rows
    .filter(r => r && typeof r === 'object' && !Array.isArray(r))
    .filter(r => !r.discontinued && !r.excluded);
  const pricedRows = active.map(row => withLatestPackagePrice(row, priceRowMap));
  return {
    noPriceCount: countMissingIngredientPackagePrices(pricedRows),
    total: active.length,
  };
}

function codeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

async function getLatestPriceRowMap() {
  try {
    const { getPriceFiles, getPriceRowsByFileId } = await import('@/lib/price');
    const files = await getPriceFiles();
    const latest = Array.isArray(files) ? files.find(file => file?.id != null) : null;
    if (!latest) return new Map();

    const rows = await getPriceRowsByFileId(latest.id);
    const map = new Map();
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const key = codeKey(row.productCode);
      if (key && !map.has(key)) map.set(key, row);
    }
    return map;
  } catch {
    return new Map();
  }
}

function readLatestPackagePrice(row, priceRowMap) {
  const productCode = codeKey(row.productCode);
  if (productCode) {
    const priceRow = priceRowMap.get(productCode);
    if (priceRow?.priceWithTax != null) return priceRow.priceWithTax;
  }
  if (Array.isArray(row.compositeOf) && row.compositeOf.length > 0) {
    return resolveCompositePrice(row.compositeOf, priceRowMap, { mode: 'strict' }).priceWithTax;
  }
  return null;
}

function withLatestPackagePrice(row, priceRowMap) {
  const latestPrice = readLatestPackagePrice(row, priceRowMap);
  return latestPrice == null ? row : { ...row, priceWithTax: latestPrice };
}
