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

/** 오래된 레시피의 코드 없는 구성품을 안전하게 연결하기 위한 이름→단가 키 맵. */
export function uniqueIngredientPriceKeysByName(allMeta) {
  const keys = new Map();
  for (const meta of asObjectArray(allMeta)) {
    if (meta?.discontinued || meta?.excluded) continue;
    const name = normName(meta?.ingredientName);
    if (!name) continue;
    const key = ingredientPriceKey(meta);
    if (!key) continue;
    if (!keys.has(name)) keys.set(name, key);
    else keys.set(name, null);
  }
  return keys;
}

/**
 * unitPriceMap(키 → {ingredientName, discontinued, excluded, ...})만으로 만드는 같은 이름→키 맵.
 * 식자재 원본 목록 없이 단가 맵만 가진 원가 계산 경로(마진표·보고서·출력)용.
 */
export function uniquePriceKeysByNameFromMap(unitPriceMap) {
  const keys = new Map();
  if (!unitPriceMap || typeof unitPriceMap[Symbol.iterator] !== 'function') return keys;
  for (const [key, info] of unitPriceMap) {
    if (info?.discontinued || info?.excluded) continue;
    const name = normName(info?.ingredientName);
    if (!name || !key) continue;
    if (!keys.has(name)) keys.set(name, key);
    else keys.set(name, null);
  }
  return keys;
}

/** 코드가 없는 이전 구성품만 정확히 하나의 식자재와 이름이 일치할 때 연결한다. */
export function linkLegacyRecipeComponent(component, keysByName) {
  if (asDisplayText(component?.productCode).trim()) return component;
  const key = keysByName?.get(normName(component?.ingredientName));
  return key ? { ...component, productCode: key } : component;
}
