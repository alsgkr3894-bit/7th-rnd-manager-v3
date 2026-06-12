/**
 * 레시피 원가 계산 순수 함수.
 * 모든 입력이 동일하면 항상 동일한 결과를 반환한다.
 */

/** 그룹 공통 식자재 원가 합산 — activeGroupIds에 포함된 그룹만 */
export function calcGroupCostBySizes(allGroups, activeGroupIds, sizeLabels, unitPriceMap) {
  const result = {};
  for (const sl of sizeLabels) result[sl] = 0;
  for (const group of allGroups) {
    if (!activeGroupIds.has(group.id)) continue;
    for (const ing of group.ingredients || []) {
      const info = unitPriceMap.get(ing.productCode);
      if (!info?.unitPrice) continue;
      for (const sl of sizeLabels) {
        const qty = parseFloat(ing.quantities?.[sl]) || 0;
        if (qty) result[sl] = (result[sl] || 0) + info.unitPrice * qty;
      }
    }
  }
  return result;
}

/** 레시피 직접 식자재 원가 합산 */
export function calcIngredientCostBySizes(ingredients, sizeLabels, unitPriceMap) {
  const result = {};
  for (const sl of sizeLabels) {
    result[sl] = ingredients.reduce((acc, line) => {
      const info = unitPriceMap.get(line.productCode);
      if (!info?.unitPrice) return acc;
      const qty = parseFloat(line.quantities?.[sl]) || 0;
      return acc + (qty ? info.unitPrice * qty : 0);
    }, 0);
  }
  return result;
}

/** 전체 원가 합산 (직접 식자재 + 그룹 공통) */
export function calcTotalCostBySizes(ingredientCost, groupCost, sizeLabels) {
  const result = {};
  for (const sl of sizeLabels) {
    result[sl] = (ingredientCost[sl] || 0) + (groupCost[sl] || 0);
  }
  return result;
}
