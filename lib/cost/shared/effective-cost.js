import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';
import {
  linkLegacyRecipeComponent,
  uniquePriceKeysByNameFromMap,
} from '@/lib/cost/shared/ingredient-price-key';

// unitPriceMap별 이름→키 색인 캐시. 맵 크기가 바뀌면(식자재 추가·삭제) 다시 만든다.
const nameIndexCache = new WeakMap();

function nameIndexOf(unitPriceMap) {
  if (!unitPriceMap || typeof unitPriceMap !== 'object' || !unitPriceMap.size) return null;
  const cached = nameIndexCache.get(unitPriceMap);
  if (cached && cached.size === unitPriceMap.size) return cached.keys;
  const keys = uniquePriceKeysByNameFromMap(unitPriceMap);
  nameIndexCache.set(unitPriceMap, { size: unitPriceMap.size, keys });
  return keys;
}

/**
 * 구성품의 최신 단가.
 * 제품코드가 있으면 그 식자재의 현재 단가. 코드가 없는 옛 구성품(수동 식자재 등)은 사용 중인
 * 식자재 중 이름이 정확히 하나일 때만 그 식자재에 연결해 현재 단가를 따르고, 못 찾거나
 * 이름이 겹치면 저장된 component.unitPrice를 쓴다. 모든 원가 화면이 이 한 함수를 거친다.
 */
export function componentEffectiveUnitPrice(component, unitPriceMap = new Map()) {
  const productCode = asDisplayText(component?.productCode);
  const resolved = productCode
    ? component
    : linkLegacyRecipeComponent(component, nameIndexOf(unitPriceMap));
  const code = productCode || asDisplayText(resolved?.productCode);
  const linked = code ? unitPriceMap.get(code) : null;
  const linkedUnitPrice = asFiniteNumber(linked?.unitPrice, null);
  if (linked) return linkedUnitPrice;
  return asFiniteNumber(component?.unitPrice, null);
}

export function effectiveComponentSubtotal(component, unitPriceMap = new Map()) {
  const quantity = asFiniteNumber(component?.quantity, null);
  const unitPrice = componentEffectiveUnitPrice(component, unitPriceMap);
  if (quantity == null || unitPrice == null) return 0;
  return quantity * unitPrice;
}

export function effectiveComponentsRawCost(components, unitPriceMap = new Map()) {
  return asObjectArray(components).reduce(
    (sum, component) => sum + effectiveComponentSubtotal(component, unitPriceMap),
    0
  );
}

export function effectiveComponentsCost(components, unitPriceMap = new Map()) {
  return Math.round(effectiveComponentsRawCost(components, unitPriceMap));
}
