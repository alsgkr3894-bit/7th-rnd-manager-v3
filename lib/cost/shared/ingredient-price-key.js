/**
 * lib/cost/shared/ingredient-price-key.js — 식자재 ↔ unitPriceMap 키 (순수)
 *
 * unitPriceMap(lib/recipe buildUnitPriceMap)의 키는 제품코드가 있으면 제품코드, 없는 수동
 * 식자재는 String(id)다. 구성품이 이 키를 productCode에 저장해야 최신 단가를 따라간다.
 * (공통묶음 편집기·엣지·추가토핑 원가가 같은 규칙을 쓴다.)
 */
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/** unitPriceMap 키 — 제품코드, 없으면 식자재 id */
export function ingredientPriceKey(meta) {
  const code = asDisplayText(meta?.productCode).trim();
  if (code) return code;
  return meta?.id != null ? String(meta.id) : '';
}

function normName(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 이름으로 식자재를 찾는다. 사용 중인 식자재 중 이름이 정확히 하나로 특정될 때만 돌려주고,
 * 겹치거나(모호) 단종·제외된 것은 연결하지 않는다.
 */
export function findIngredientByUniqueName(allMeta, name) {
  const target = normName(name);
  if (!target) return null;
  const matches = asObjectArray(allMeta).filter(
    meta => !meta?.discontinued && !meta?.excluded && normName(meta?.ingredientName) === target
  );
  return matches.length === 1 ? matches[0] : null;
}
