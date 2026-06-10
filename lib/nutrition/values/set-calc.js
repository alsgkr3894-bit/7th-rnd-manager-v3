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

import { addNutrition } from './store';
import { EDGE_VARIANTS, SIDE_BASE_CRUST } from '@/lib/nutrition/crust-config';
import { asDisplayText } from '@/lib/ui/prop-guards';

/** @private rawMap에서 메뉴의 한판 총열량 + 총중량 반환 (석쇠L → 씬바사삭L 순 폴백) */
function menuFullData(menuCode, rawMap) {
  const raw = rawMap[`${menuCode}__석쇠L`] || rawMap[`${menuCode}__씬바사삭L`] || {};
  return rawFullData(raw);
}

function rawFullData(raw) {
  const w = parseFloat(raw.weight);
  const k = parseFloat(raw.kcal);
  if (isNaN(w) || w <= 0 || isNaN(k) || k <= 0) return null;
  return { kcal: Math.round((k * w) / 100), weight: w };
}

const BASE_VARIANTS = [
  { crustType: '석쇠L', crustLabel: '석쇠', side: 'L' },
  { crustType: '석쇠R', crustLabel: '석쇠', side: 'R' },
  { crustType: '씬바사삭L', crustLabel: '씬바사삭', side: 'L' },
  { crustType: '씬바사삭R', crustLabel: '씬바사삭', side: 'R' },
];

const SET_SIDES = ['L', 'R'];

function variantSortDesc(a, b) {
  return (
    b.kcal - a.kcal ||
    a.menuName.localeCompare(b.menuName, 'ko') ||
    a.label.localeCompare(b.label, 'ko')
  );
}

function pickPair(items, mode) {
  if (!items.length) return { kcal: null, weight: null, items: [] };
  const sorted = [...items].sort((a, b) => a.kcal - b.kcal);
  const pair =
    mode === 'high'
      ? [sorted[sorted.length - 1], sorted[Math.max(sorted.length - 2, 0)]]
      : [sorted[0], sorted[Math.min(1, sorted.length - 1)]];
  return {
    kcal: Math.round((pair[0].kcal + pair[1].kcal) / 2),
    weight: Math.round((pair[0].weight + pair[1].weight) / 2),
    items: pair.filter(Boolean),
  };
}

/**
 * 피자 메뉴의 한판 총열량 후보를 크러스트·엣지·사이즈별로 반환한다.
 * 엣지 행은 해당 사이즈 석쇠 중량을 기준으로 총열량을 계산한다.
 */
export function getPizzaCalorieVariants(menu, rawMap, edgeMap = {}) {
  const menuCode = asDisplayText(menu?.menuCode);
  if (!menuCode) return [];
  const menuName = asDisplayText(menu?.menuName, menuCode);
  const variants = [];

  BASE_VARIANTS.forEach(def => {
    const raw = rawMap?.[`${menuCode}__${def.crustType}`] || {};
    const full = rawFullData(raw);
    if (!full) return;
    variants.push({
      menuCode,
      menuName,
      crustType: def.crustType,
      crustLabel: def.crustLabel,
      edgeCode: null,
      side: def.side,
      label: `${def.crustLabel}${def.side}`,
      kcal: full.kcal,
      weight: full.weight,
    });
  });

  EDGE_VARIANTS.forEach(({ edgeCode, side }) => {
    const baseCrust = SIDE_BASE_CRUST[side];
    const base = rawMap?.[`${menuCode}__${baseCrust}`] || {};
    const edge = edgeMap?.[edgeCode] || {};
    const combined = addNutrition(base, edge);
    const full = rawFullData({ ...combined, weight: base.weight });
    if (!full) return;
    const crustLabel = edgeCode.replace(/[LR]$/, '');
    variants.push({
      menuCode,
      menuName,
      crustType: edgeCode,
      crustLabel,
      edgeCode,
      side,
      label: `${crustLabel}${side}`,
      kcal: full.kcal,
      weight: full.weight,
    });
  });

  return variants.sort(variantSortDesc);
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
export function calcSetMinMax(slots, menuRefs, rawMap, masterByCode, pizzaMenus, edgeMap = {}) {
  const bySize = calcSetMinMaxBySize(slots, menuRefs, rawMap, masterByCode, pizzaMenus, edgeMap);
  const sizeResults = Object.values(bySize).filter(
    v => v && v.minKcal != null && v.maxKcal != null
  );
  if (!sizeResults.length) return { minKcal: null, maxKcal: null, bySize };
  return {
    minKcal: Math.round(Math.min(...sizeResults.map(v => v.minKcal))),
    maxKcal: Math.round(Math.max(...sizeResults.map(v => v.maxKcal))),
    bySize,
  };
}

export function calcSetMinMaxBySize(slots, menuRefs, rawMap, masterByCode, pizzaMenus, edgeMap = {}) {
  const allPizzas =
    pizzaMenus ||
    menuRefs.filter(m => {
      const cat = masterByCode?.[m.menuCode]?.category || m.category || '';
      return cat.startsWith('피자') || cat === '1인피자';
    });

  const pizzaVariants = allPizzas.flatMap(m => getPizzaCalorieVariants(m, rawMap, edgeMap));

  if (!pizzaVariants.length) {
    return Object.fromEntries(SET_SIDES.map(side => [side, { minKcal: null, maxKcal: null }]));
  }

  let slotMin = 0,
    slotMax = 0;
  for (const slot of slots || []) {
    const candidates = getCandidateMenus(slot, menuRefs, masterByCode);
    const kcals = candidates
      .map(m => menuFullData(m.menuCode, rawMap)?.kcal)
      .filter(v => v != null && v > 0);
    if (!kcals.length) {
      return Object.fromEntries(SET_SIDES.map(side => [side, { minKcal: null, maxKcal: null }]));
    }
    slotMin += Math.min(...kcals);
    slotMax += Math.max(...kcals);
  }

  const result = {};
  SET_SIDES.forEach(side => {
    const sideKcals = pizzaVariants.filter(v => v.side === side).map(v => v.kcal);
    result[side] = sideKcals.length
      ? {
          minKcal: Math.round(Math.min(...sideKcals) + slotMin),
          maxKcal: Math.round(Math.max(...sideKcals) + slotMax),
        }
      : { minKcal: null, maxKcal: null };
  });
  return result;
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
    return {
      minKcal: null,
      maxKcal: null,
      minWeight: null,
      maxWeight: null,
      variants: [],
      bySide: {},
    };

  // 피자별 한판 총열량 + 총중량
  const variants = pizzaMenuRefs.flatMap(menu => getPizzaCalorieVariants(menu, rawMap, edgeMap));

  if (!variants.length)
    return {
      minKcal: null,
      maxKcal: null,
      minWeight: null,
      maxWeight: null,
      variants: [],
      bySide: {},
    };

  const low = pickPair(variants, 'low');
  const high = pickPair(variants, 'high');
  const bySide = {};
  SET_SIDES.forEach(side => {
    const sideItems = variants.filter(v => v.side === side);
    const sideLow = pickPair(sideItems, 'low');
    const sideHigh = pickPair(sideItems, 'high');
    bySide[side] = {
      minKcal: sideLow.kcal,
      maxKcal: sideHigh.kcal,
      minWeight: sideLow.weight,
      maxWeight: sideHigh.weight,
      lowItems: sideLow.items,
      highItems: sideHigh.items,
      variants: sideItems.sort(variantSortDesc),
    };
  });

  return {
    minKcal: low.kcal,
    maxKcal: high.kcal,
    minWeight: low.weight,
    maxWeight: high.weight,
    lowItems: low.items,
    highItems: high.items,
    variants: variants.sort(variantSortDesc).map((item, index, arr) => ({
      ...item,
      rank: index + 1,
      highRank: index < 2,
      lowRank: index >= Math.max(arr.length - 2, 0),
    })),
    bySide,
  };
}

/**
 * rawMap + edgeMap에서 특정 menuCode의 모든 변형(크러스트+엣지) kcal 목록 반환 (per 100g).
 * TabSetCalc의 참고용 — 직접 출력 계산에는 미사용.
 */
export function pizzaVariantKcals(menuCode, rawMap, edgeMap) {
  return getPizzaCalorieVariants({ menuCode }, rawMap, edgeMap).map(v => v.kcal);
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
