export {
  getAllIngredients,
  getIngredientMetaMap,
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  deleteIngredient,
  excludeIngredientByCode,
  restoreIngredientByCode,
} from './store';

import { simplifyIngredientName } from '@/lib/normalize';

/**
 * price_rows + cost_ingredients 메타를 합쳐 화면용 행 반환 (리스트 페이지용)
 * displayName: 무게/온도/원산지 등을 제거한 단순 표시명
 */
export function mergeIngredientRows(priceRows, metaMap) {
  return priceRows.map(p => {
    const meta      = metaMap.get(p.productCode) || {};
    const hasRecord = metaMap.has(p.productCode);
    const baseQty   = meta.baseQuantity ?? null;
    const unitType  = meta.baseUnitType  ?? p.salesUnit ?? 'g';
    const unitPrice = baseQty && baseQty > 0 && p.priceWithTax
      ? Math.round(p.priceWithTax / baseQty * 100) / 100
      : null;
    return {
      productCode:    p.productCode,
      productName:    p.productName,
      displayName:    simplifyIngredientName(p.productName),
      ingredientName: meta.ingredientName || '',
      temperature:    p.temperature,
      salesUnit:      p.salesUnit,
      taxType:        p.taxType,
      price:          p.price,
      priceWithTax:   p.priceWithTax,
      category:       meta.category     || '',
      baseQuantity:   baseQty,
      baseUnitType:   unitType,
      note:           meta.note         || '',
      unitPrice,
      jetteLinked:    true,
      excluded:       meta.excluded === true,
      hasRecord,
    };
  });
}
