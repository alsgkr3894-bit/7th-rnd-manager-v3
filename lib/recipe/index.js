export { getAllRecipes, saveRecipe, deleteRecipe } from './store';

export const MENU_CATEGORIES = [
  '피자', '피자/프리미엄 스페셜', '피자/프리미엄', '피자/오리지널', '피자/하프앤하프',
  '1인피자', '세트박스', '사이드', '소스', '음료', '엣지', '기타',
];

/**
 * 식자재 마스터 + 최신 가격 파일로 단가 맵 생성
 * productCode → { ingredientName, priceWithTax, baseQuantity, baseUnitType, unitPrice }
 */
export function buildUnitPriceMap(allMeta, priceRowMap) {
  const map = new Map();
  for (const m of allMeta) {
    if (!m.productCode) continue;
    const baseQty = m.baseQuantity;

    let priceWithTax = null;
    if (Array.isArray(m.compositeOf) && m.compositeOf.length > 0) {
      // 구성 코드 전부 단가가 있을 때만 합산 — 일부 누락 시 partial price 방지
      const prices = m.compositeOf.map(code => priceRowMap.get(code)?.priceWithTax ?? null);
      if (prices.every(p => p !== null)) {
        const sum = prices.reduce((acc, p) => acc + p, 0);
        if (sum > 0) priceWithTax = sum;
      } else {
        priceWithTax = m.priceOverride ?? null;
      }
    } else {
      const pr = priceRowMap.get(m.productCode);
      priceWithTax = pr?.priceWithTax ?? m.priceOverride ?? null;
    }

    const unitPrice = (baseQty && baseQty > 0 && priceWithTax != null)
      ? Math.round(priceWithTax / baseQty * 100) / 100
      : null;

    map.set(m.productCode, {
      ingredientName: m.ingredientName || '',
      priceWithTax,
      baseQuantity:  baseQty,
      baseUnitType:  m.baseUnitType || 'g',
      unitPrice,
    });
  }
  return map;
}

/**
 * 특정 사이즈의 레시피 원가 계산
 * @param {string} sizeLabel - 'L' | 'R' | ... (없으면 첫 번째 사이즈 사용)
 */
export function calcRecipeCost(recipe, unitPriceMap, sizeLabel) {
  if (!recipe?.ingredients?.length) return 0;
  const label = sizeLabel ?? recipe.sizes?.[0]?.label ?? null;
  return recipe.ingredients.reduce((acc, line) => {
    const info = unitPriceMap.get(line.productCode);
    if (!info?.unitPrice) return acc;
    const qty = label != null
      ? (line.quantities?.[label] ?? 0)
      : 0;
    if (!qty) return acc;
    return acc + info.unitPrice * qty;
  }, 0);
}

/** 사이즈별 원가 맵 반환: { L: 1200, R: 900 } */
export function calcCostBySizes(recipe, unitPriceMap) {
  const result = {};
  for (const s of (recipe?.sizes || [])) {
    result[s.label] = calcRecipeCost(recipe, unitPriceMap, s.label);
  }
  return result;
}

/** 원가율 계산 (0~100 %) */
export function calcMarginRate(cost, sellingPrice) {
  if (!sellingPrice || sellingPrice <= 0) return null;
  return (cost / sellingPrice) * 100;
}
