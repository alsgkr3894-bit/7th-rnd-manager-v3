export {
  getAllIngredients,
  getIngredientMetaMap,
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  deleteIngredient,
} from './store';

/**
 * price_rows + cost_ingredients 메타를 합쳐 화면용 행 반환 (리스트 페이지용)
 */
export function mergeIngredientRows(priceRows, metaMap) {
  return priceRows.map(p => {
    const meta     = metaMap.get(p.productCode) || {};
    const baseQty  = meta.baseQuantity ?? null;
    const unitType = meta.baseUnitType  ?? p.salesUnit ?? 'g';
    const unitPrice = baseQty && baseQty > 0 && p.priceWithTax
      ? Math.round(p.priceWithTax / baseQty * 100) / 100
      : null;
    return {
      productCode:  p.productCode,
      productName:  p.productName,
      temperature:  p.temperature,
      salesUnit:    p.salesUnit,
      taxType:      p.taxType,
      price:        p.price,
      priceWithTax: p.priceWithTax,
      category:     meta.category     || '',
      baseQuantity: baseQty,
      baseUnitType: unitType,
      note:         meta.note         || '',
      unitPrice,
    };
  });
}
