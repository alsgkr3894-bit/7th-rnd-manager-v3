/**
 * lib/ingredient/import.js — 식자재 벌크 임포트 (엑셀 마스터파일 가져오기)
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { findMissingRefs } from './composite-refs';
import { productCodeKey, recordsByProductCode, compareIngredientKeep } from './product-code';
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';
import { normalizeTags, readTags } from './normalize';

function importedOptionalNumber(value, fallback = null) {
  if (value == null) return fallback;
  const parsed = parseOptionalNonNegativeNumber(value);
  return parsed.ok ? parsed.value : null;
}

/**
 * 엑셀에서 파싱된 품목 배열을 cost_ingredients에 upsert.
 * productCode 기준으로 기존 항목이 있으면 업데이트, 없으면 신규 삽입.
 *
 * compositeOf (string[] | null): 이 식자재가 다른 제품코드의 조합으로
 * 구성될 때 참조하는 productCode 배열. 참조 코드의 실제 존재 여부는
 * best-effort로만 검증(console.warn)하며 저장을 막지 않는다.
 */
export async function bulkImportIngredients(items) {
  await assertActiveAdmin('식자재 일괄 가져오기');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  if (!Array.isArray(items) || !items.length) return { inserted: 0, updated: 0, total: 0 };
  const all = await getAll('cost_ingredients');
  const byCode = new Map(
    [...recordsByProductCode(all).entries()].map(([key, rows]) => [
      key,
      [...rows].sort(compareIngredientKeep)[0],
    ])
  );
  const importCodes = new Set(
    items.filter(it => it.productCode).map(it => String(it.productCode).trim().toLowerCase())
  );
  const existingCodes = new Set(
    all.filter(r => r.productCode).map(r => String(r.productCode).trim().toLowerCase())
  );
  const allKnownCodes = new Set([...existingCodes, ...importCodes]);
  for (const it of items) {
    if (!Array.isArray(it.compositeOf) || !it.compositeOf.length) continue;
    const missing = findMissingRefs(it.compositeOf, allKnownCodes);
    if (missing.length) {
      console.warn(
        `[ingredient/import] bulkImportIngredients: ${it.productCode} compositeOf 참조 코드 없음:`,
        missing
      );
    }
  }
  const now = new Date().toISOString();
  let inserted = 0,
    updated = 0;
  const recordsByCode = new Map();
  for (const it of items) {
    const codeKey = productCodeKey(it.productCode) || `__row_${recordsByCode.size}`;
    const existing = byCode.get(codeKey);
    const photos = normalizeIngredientPhotos(
      it.photos ?? existing?.photos,
      it.photo ?? existing?.photo
    );
    const record = {
      ...(existing || {}),
      productCode: it.productCode,
      ingredientName: existing?.ingredientName?.trim() || it.productName || '',
      category: it.category || existing?.category || '',
      tags: normalizeTags(it.tags ?? existing?.tags ?? readTags(existing)),
      manufacturer: it.manufacturer || existing?.manufacturer || '',
      discontinued: it.discontinued === true,
      taxType: it.taxType ?? existing?.taxType ?? '과세',
      baseQuantity: importedOptionalNumber(it.baseQuantity, existing?.baseQuantity ?? null),
      baseUnitType: it.baseUnitType || existing?.baseUnitType || 'g',
      priceOverride: importedOptionalNumber(it.priceOverride, existing?.priceOverride ?? null),
      compositeOf: it.compositeOf ?? existing?.compositeOf ?? null,
      note: it.note ?? existing?.note ?? '',
      photos,
      photo: getPrimaryIngredientPhoto({ photos }),
      isManual: it.isManual === true,
      isSeeded: true,
      updatedAt: now,
    };
    delete record.categories;
    recordsByCode.set(codeKey, { record, existing: !!existing });
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
