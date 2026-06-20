/**
 * lib/ingredient/seed.js — 7번가(main) 전용 식자재 마스터 시드
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { getActiveBrandId } from '@/lib/active-brand';
import { productCodeKey, recordsByProductCode, compareIngredientKeep } from './product-code';
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';
import { normalizeTags } from './normalize';

export async function seedMasterIngredients(items) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  if (getActiveBrandId() !== 'main')
    throw new Error('7번가피자 전용 시드입니다. 현재 브랜드에는 적용되지 않습니다.');
  if (!Array.isArray(items) || !items.length) return { inserted: 0, updated: 0, total: 0 };
  const all = await getAll('cost_ingredients');
  const byCode = new Map(
    [...recordsByProductCode(all).entries()].map(([key, rows]) => [
      key,
      [...rows].sort(compareIngredientKeep)[0],
    ])
  );
  const now = new Date().toISOString();
  let inserted = 0,
    updated = 0;
  const recordsByCode = new Map();
  for (const it of items) {
    const codeKey = productCodeKey(it.productCode) || `__row_${recordsByCode.size}`;
    const existing = byCode.get(codeKey);
    const photos = normalizeIngredientPhotos(existing?.photos, existing?.photo);
    const base = {
      ...(existing || {}),
      productCode: it.productCode,
      ingredientName: existing?.ingredientName?.trim() || it.productName,
      category: it.category || '',
      tags: normalizeTags(it.tags),
      manufacturer: it.manufacturer || existing?.manufacturer || '',
      discontinued: it.discontinued === true,
      taxType: existing?.taxType || '과세',
      baseQuantity: existing?.baseQuantity ?? null,
      baseUnitType: existing?.baseUnitType || 'g',
      note: existing?.note || '',
      photos,
      photo: getPrimaryIngredientPhoto({ photos }),
      isManual: false,
      isSeeded: true,
      updatedAt: now,
    };
    delete base.categories;
    recordsByCode.set(codeKey, { record: base, existing: !!existing });
  }
  const records = [...recordsByCode.values()].map(({ record, existing }) => {
    if (existing) updated++;
    else inserted++;
    return record;
  });
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const s = tx.objectStore('cost_ingredients');
    for (const r of records) s.put(r);
  });
  return { inserted, updated, total: records.length };
}
