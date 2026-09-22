import { componentSubtotal, simpleTotalCost, recipeIssues } from '@/lib/cost/shared/calc';
import { effectiveComponentsCost } from '@/lib/cost/shared/effective-cost';

export { componentSubtotal, recipeIssues as edgeIssues };

/**
 * 엣지(도우) 원가 합계. unitPriceMap을 주면 구성품의 최신 제때 단가로 다시 계산하고
 * (componentEffectiveUnitPrice 우선순위: 최신 단가 → 저장된 component.unitPrice),
 * 안 주면 저장된 component.unitPrice 그대로 합산한다(편집 중 입력값 미리보기용).
 *
 * 2026-09-22: 엣지 원가가 EdgeEditModal 재저장 전까지 최신 식자재 단가를 반영하지 않던
 * 문제 수정 — 메뉴마스터 요약·원가보고서·원가마진표·엣지 관리 목록은 이제 unitPriceMap을
 * 넘겨 항상 최신 단가로 계산한다.
 *
 * @param {{ components?: object[] }} recipe
 * @param {Map<string, {unitPrice: number|null}>} [unitPriceMap]
 */
export function edgeTotalCost(recipe, unitPriceMap) {
  if (!recipe?.components?.length) return 0;
  if (!unitPriceMap) return simpleTotalCost(recipe);
  return effectiveComponentsCost(recipe.components, unitPriceMap);
}
