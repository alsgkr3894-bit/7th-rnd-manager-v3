/**
 * lib/ingredient/sync.js — 제때 가격 → 식자재 baseQuantity 동기화 유틸
 *
 * 가장 최신 가격 파일의 price_rows.quantity 값을
 * productCode가 일치하는 cost_ingredients.baseQuantity에 동기화합니다.
 * priceOverride(수동 단가)가 설정된 항목이나 quantity가 없는 행은 건너뜁니다.
 */

import { getAllIngredients, updateIngredient } from './store.js';
import { getPriceFiles, getPriceRowsByFileId } from '../price/index.js';

/**
 * 최신 제때 가격 파일의 수량 데이터를 식자재 baseQuantity에 동기화.
 * productCode가 일치하는 식자재만 업데이트.
 *
 * @returns {Promise<{updated: number, skipped: number}>}
 */
export async function syncBaseQuantityFromPrice() {
  // 가장 최신 가격 파일 조회 (updateDate 내림차순 정렬 기준 첫 번째)
  const files = await getPriceFiles();
  if (!files.length) return { updated: 0, skipped: 0 };

  const latestFile = files[0];
  const priceRows  = await getPriceRowsByFileId(latestFile.id);
  if (!priceRows.length) return { updated: 0, skipped: 0 };

  // productCode → quantity 맵 구성 (quantity가 있는 행만)
  const quantityByCode = new Map();
  for (const row of priceRows) {
    if (row.productCode && row.quantity != null && row.quantity > 0) {
      quantityByCode.set(row.productCode, row.quantity);
    }
  }

  const ingredients = await getAllIngredients();
  let updated = 0;
  let skipped = 0;

  for (const ing of ingredients) {
    if (!ing.productCode) { skipped++; continue; }
    const qty = quantityByCode.get(ing.productCode);
    if (qty == null)              { skipped++; continue; }
    if (ing.baseQuantity === qty) { skipped++; continue; }

    await updateIngredient(ing.id, { ...ing, baseQuantity: qty });
    updated++;
  }

  return { updated, skipped };
}
