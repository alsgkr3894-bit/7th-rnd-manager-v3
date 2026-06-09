/**
 * lib/nutrition/values/set-calc.js — 세트박스·하프앤하프 최소/최대 열량 산출 (순수 함수)
 *
 * 모든 열량은 "총열량 = kcal_per_100g × rawMap[key].weight / 100" 기준.
 * 150g 고정이 아니라 각 메뉴에 입력된 실제 총중량을 사용.
 *
 * 세트박스:
 *   min = 최저 피자 총열량 + Σ(각 슬롯 최저 총열량)
 *   max = 최고 피자 총열량 + Σ(각 슬롯 최고 총열량)
 *
 * 하프앤하프:
 *   모든 피자 메뉴의 한판 총열량을 구한 뒤,
 *   min = 열량 최저 2가지의 반씩 합 = (low1 + low2) / 2
 *   max = 열량 최고 2가지의 반씩 합 = (hi1 + hi2) / 2
 */

import { CRUST_TYPES, addNutrition } from './store';
import { EDGE_VARIANTS, SIDE_BASE_CRUST } from '@/lib/nutrition/crust-config';

/** @private rawMap에서 메뉴의 한판 총열량 + 총중량 반환 (석쇠L → 씬바사삭L 순 폴백) */
function menuFullData(menuCode, rawMap) {
  const raw = rawMap[`${menuCode}__석쇠L`] || rawMap[`${menuCode}__씬바사삭L`] || {};
  const w = parseFloat(raw.weight);
  const k = parseFloat(raw.kcal);
  if (isNaN(w) || w <= 0 || isNaN(k) || k <= 0) return null;
  return { kcal: Math.round((k * w) / 100), weight: w };
}

/**
 * 세트박스 min/max 계산.
 * 피자는 pizzaMenus(또는 masterByCode 기반 자동 판별)에서 자동 결정.
 * slots는 피자 외 구성품 — menuCodes 배열로 특정 메뉴 지정.
 *
 * @param {Array<{ label: string, menuCodes?: string[], category?: string }>} slots
 * @param {Array} menuRefs
 * @param {object} rawMap
 * @param {object} masterByCode
 * @param {Array} [pizzaMenus]
 * @returns {{ minKcal: number|null, maxKcal: number|null }}
 */
export function calcSetMinMax(slots, menuRefs, rawMap, masterByCode, pizzaMenus) {
  const allPizzas =
    pizzaMenus ||
    menuRefs.filter(m => {
      const cat = masterByCode?.[m.menuCode]?.category || m.category || '';
      return cat.startsWith('피자') || cat === '1인피자';
    });

  const pizzaKcals = allPizzas
    .map(m => menuFullData(m.menuCode, rawMap)?.kcal)
    .filter(v => v != null && v > 0);

  if (!pizzaKcals.length) return { minKcal: null, maxKcal: null };

  let slotMin = 0,
    slotMax = 0;
  for (const slot of slots || []) {
    const candidates = getCandidateMenus(slot, menuRefs, masterByCode);
    const kcals = candidates
      .map(m => menuFullData(m.menuCode, rawMap)?.kcal)
      .filter(v => v != null && v > 0);
    if (!kcals.length) return { minKcal: null, maxKcal: null };
    slotMin += Math.min(...kcals);
    slotMax += Math.max(...kcals);
  }

  return {
    minKcal: Math.round(Math.min(...pizzaKcals) + slotMin),
    maxKcal: Math.round(Math.max(...pizzaKcals) + slotMax),
  };
}

/**
 * 하프앤하프 min/max 계산.
 * 각 피자 메뉴의 한판 총열량을 구한 뒤, 열량 기준으로 정렬.
 *   min = 열량 가장 낮은 2가지 반반 = (low1 + low2) / 2
 *   max = 열량 가장 높은 2가지 반반 = (hi1 + hi2) / 2
 * 피자가 1가지뿐이면 min = max = 그 피자의 총열량 (같은 피자 두 반반).
 *
 * @param {Array} pizzaMenuRefs
 * @param {object} rawMap
 * @param {object} edgeMap  (현재 미사용, 시그니처 호환 유지)
 * @returns {{ minKcal: number|null, maxKcal: number|null, minWeight: number|null, maxWeight: number|null }}
 */
export function calcHalfMinMax(pizzaMenuRefs, rawMap, edgeMap) {
  if (!pizzaMenuRefs?.length)
    return { minKcal: null, maxKcal: null, minWeight: null, maxWeight: null };

  // 피자별 한판 총열량 + 총중량
  const menuTotals = pizzaMenuRefs
    .map(menu => {
      const d = menuFullData(menu.menuCode, rawMap);
      return d ? { ...d, menuCode: menu.menuCode } : null;
    })
    .filter(x => x != null);

  if (!menuTotals.length) return { minKcal: null, maxKcal: null, minWeight: null, maxWeight: null };

  menuTotals.sort((a, b) => a.kcal - b.kcal);
  const n = menuTotals.length;

  const lo1 = menuTotals[0],
    lo2 = menuTotals[Math.min(1, n - 1)];
  const hi1 = menuTotals[n - 1],
    hi2 = menuTotals[Math.max(n - 2, 0)];

  return {
    minKcal: Math.round((lo1.kcal + lo2.kcal) / 2),
    maxKcal: Math.round((hi1.kcal + hi2.kcal) / 2),
    minWeight: Math.round((lo1.weight + lo2.weight) / 2),
    maxWeight: Math.round((hi1.weight + hi2.weight) / 2),
  };
}

/**
 * rawMap + edgeMap에서 특정 menuCode의 모든 변형(크러스트+엣지) kcal 목록 반환 (per 100g).
 * TabSetCalc의 참고용 — 직접 출력 계산에는 미사용.
 */
export function pizzaVariantKcals(menuCode, rawMap, edgeMap) {
  const kcals = [];
  CRUST_TYPES.forEach(ct => {
    const v = parseFloat(rawMap[`${menuCode}__${ct}`]?.kcal);
    if (!isNaN(v) && v > 0) kcals.push(v);
  });
  EDGE_VARIANTS.forEach(({ edgeCode, side }) => {
    const base = rawMap[`${menuCode}__${SIDE_BASE_CRUST[side]}`] || {};
    const edge = edgeMap[edgeCode] || {};
    const sum = addNutrition(base, edge);
    const v = parseFloat(sum.kcal);
    if (!isNaN(v) && v > 0) kcals.push(v);
  });
  return kcals;
}

/** @private 슬롯 정의에서 후보 메뉴 목록 추출 (피자 카테고리 제외 — 피자는 항상 자동) */
function getCandidateMenus(slot, menuRefs, masterByCode) {
  if (slot.menuCodes?.length) {
    return menuRefs.filter(m => slot.menuCodes.includes(m.menuCode));
  }
  if (slot.category && slot.category !== '피자') {
    return menuRefs.filter(m => {
      const cat = masterByCode?.[m.menuCode]?.category || m.category || '';
      return cat === slot.category || cat.startsWith(slot.category);
    });
  }
  return [];
}
