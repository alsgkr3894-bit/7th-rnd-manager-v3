/**
 * 영양성분표 빌더 공통 유틸리티 — 시트 빌더에서 내부적으로 import한다.
 */
import { addNutrition } from '@/lib/nutrition/values/store';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';
import {
  NUTRITION_GROUP_ORDER,
  isPersonalPizzaMenu,
  resolveNutritionGroup,
} from '@/lib/nutrition/menu-group';
import { allergenNames } from '@/lib/nutrition/allergen/aggregate';
import {
  SERVING_CRUST_TYPE,
  THIN_CRUST_CODE,
  THIN_CRUST_LABEL,
} from '@/lib/nutrition/crust-config';
import { resolveSlices } from '@/lib/nutrition/slice-config';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { getMenuCodeRank } from '@/lib/menu-categories';

export { addNutrition, calcSetMinMax, calcHalfMinMax };
export { isPersonalPizzaMenu, resolveNutritionGroup };
export { allergenNames };
export { THIN_CRUST_CODE, THIN_CRUST_LABEL };
export { SERVING_CRUST_TYPE };
export { resolveSlices };
export { asDisplayText, asObjectArray };
export { getMenuCodeRank };

export const LABEL_COLS = [
  { key: 'weight', label: '1회중량', unit: 'g' },
  { key: 'kcal', label: '열량', unit: 'kcal' },
  { key: 'sugar', label: '당류', unit: 'g' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'fat', label: '포화지방', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
];

export const DERIVED_CRUST_TYPES = ['석쇠L', '석쇠R', THIN_CRUST_CODE];

export function roundLabelValue(value) {
  if (value === '' || value == null || value === undefined || value === '—') return value;
  const num = parseFloat(value);
  return Number.isFinite(num) ? Math.round(num) : value;
}

/** 100g 기준값 → grams 기준으로 환산 (정수 반올림) */
export function scaleVal(per100, grams) {
  if (per100 === '' || per100 == null || per100 === undefined) return '';
  const v = parseFloat(per100);
  if (isNaN(v)) return '';
  return Math.round((v * grams) / 100);
}

export function labelFieldValue(raw, key) {
  if (key !== 'fat') return raw?.[key];
  const satFat = raw?.satFat;
  return satFat === '' || satFat == null ? raw?.fat : satFat;
}

export function scaleLabelValue(raw, key, grams) {
  return scaleVal(labelFieldValue(raw, key), grams);
}

/**
 * 메뉴명 또는 코드에서 용량(ml) 파싱.
 * 1.5L → 1500, 355ml → 355, 1.25l → 1250
 */
export function parseVolumeMl(name, code) {
  const s = `${name || ''} ${code || ''}`;
  const mL = s.match(/(\d+(?:\.\d+)?)\s*[Ll](?:\b|$)/);
  if (mL) return Math.round(parseFloat(mL[1]) * 1000);
  const ml = s.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (ml) return Math.round(parseFloat(ml[1]));
  return null;
}

/** basis='serving' 행은 저장값 그대로, 아니면 scaleVal로 환산 */
export function displayVal(raw, key, weight) {
  const value = labelFieldValue(raw, key);
  if (raw.basis === 'serving') {
    return value === '' || value == null ? '—' : roundLabelValue(value);
  }
  return weight ? scaleVal(value, weight) : '—';
}

/** LABEL_COLS에 대해 scale된 객체 반환 */
export function scaledCols(raw100, grams) {
  const res = {};
  LABEL_COLS.forEach(({ key }) => {
    if (key === 'weight') {
      res.weight = grams;
      return;
    }
    res[key] = scaleLabelValue(raw100, key, grams);
  });
  return res;
}

export function primaryRawValue(rawMap, menuCode) {
  return (
    rawMap[`${menuCode}__${SERVING_CRUST_TYPE}`] ||
    rawMap[`${menuCode}__석쇠L`] ||
    rawMap[`${menuCode}__${THIN_CRUST_CODE}`] ||
    {}
  );
}

export function pizzaMenusWithPersonalLast(menus, masterByCode) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '피자')
    .map((menu, index) => ({ menu, index, personal: isPersonalPizzaMenu(menu, masterByCode) }))
    .sort((a, b) => Number(a.personal) - Number(b.personal) || a.index - b.index)
    .map(item => item.menu);
}

function groupRank(menu, masterByCode) {
  const group = resolveNutritionGroup(menu, masterByCode);
  const rank = NUTRITION_GROUP_ORDER.indexOf(group);
  return rank === -1 ? NUTRITION_GROUP_ORDER.length : rank;
}

function orderRank(menu, orderedKeys = []) {
  const rank = new Map(
    (Array.isArray(orderedKeys) ? orderedKeys : [])
      .map((key, index) => [String(key || ''), index])
      .filter(([key]) => key)
  );
  const code = String(menu?.menuCode || '');
  const name = String(menu?.menuName || '');
  if (rank.has(code)) return rank.get(code);
  if (rank.has(name)) return rank.get(name);
  return Infinity;
}

export function sortNutritionLabelMenus(menus, masterByCode = {}, orderedKeys = []) {
  return [...(Array.isArray(menus) ? menus : [])].sort(
    (a, b) =>
      orderRank(a, orderedKeys) - orderRank(b, orderedKeys) ||
      groupRank(a, masterByCode) - groupRank(b, masterByCode) ||
      getMenuCodeRank(String(a?.menuCode || '')) - getMenuCodeRank(String(b?.menuCode || '')) ||
      String(a?.menuName || '').localeCompare(String(b?.menuName || ''), 'ko') ||
      String(a?.menuCode || '').localeCompare(String(b?.menuCode || ''), 'ko')
  );
}

function mergeCodeSets(...sets) {
  const merged = new Set();
  sets.forEach(set => {
    if (!(set instanceof Set)) return;
    set.forEach(code => merged.add(code));
  });
  return merged;
}

export function allergenText(menuAllergenMap, edgeAllergenMap, menuCode, edgeCode = null) {
  return allergenNames(
    mergeCodeSets(menuAllergenMap?.get(menuCode), edgeCode ? edgeAllergenMap?.get(edgeCode) : null)
  );
}

function toppingValue(raw, key) {
  const value = labelFieldValue(raw, key);
  return value === '' || value == null ? '—' : roundLabelValue(value);
}

export function buildToppingMasterRows(toppings, toppingAllergenMap) {
  return asObjectArray(toppings)
    .slice()
    .sort(
      (a, b) =>
        (a.displayOrder ?? 999) - (b.displayOrder ?? 999) ||
        asDisplayText(a.toppingName).localeCompare(asDisplayText(b.toppingName), 'ko') ||
        asDisplayText(a.toppingCode).localeCompare(asDisplayText(b.toppingCode), 'ko')
    )
    .map(topping => {
      const toppingCode = asDisplayText(topping.toppingCode);
      return {
        menuName: asDisplayText(topping.toppingName, toppingCode || '추가토핑'),
        menuCode: toppingCode,
        productCode: asDisplayText(topping.productCode),
        ingredientName: asDisplayText(topping.ingredientName),
        weight: toppingValue(topping, 'weight'),
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            toppingValue(topping, key),
          ])
        ),
        allergen: allergenNames(toppingAllergenMap?.get(toppingCode)),
      };
    });
}

export function buildLegacyToppingRows({
  menus,
  rawMap,
  masterByCode,
  menuAllergenMap,
  menuOrder,
}) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '추가토핑')
    .map(menu => {
      const raw = primaryRawValue(rawMap, menu.menuCode);
      const isServing = raw.basis === 'serving';
      const weight = isServing ? (raw.weight ?? '—') : parseFloat(raw.weight) || null;
      const displayWeight = isServing ? roundLabelValue(weight) : roundLabelValue(weight ?? '—');
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: displayWeight,
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            displayVal(raw, key, isServing ? null : weight),
          ])
        ),
        allergen,
      };
    });
}

export function servingSlices(perSliceKcal, slice) {
  if (!(perSliceKcal > 0)) return slice || 1;
  if (perSliceKcal >= 100) return 1;
  const n = perSliceKcal * 2 <= 100 ? 3 : 2;
  return Math.min(n, slice || n);
}

export function augmentWithDerived({ menus, rawMap, compositions, masterByCode }) {
  if (!Array.isArray(compositions) || !compositions.length) return { menus, rawMap };

  const derivedMenus = [];
  const derivedRawMap = {};

  for (const comp of compositions) {
    const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode);
    if (!baseMenu) continue;

    derivedMenus.push({
      menuCode: comp.menuCode,
      menuName: comp.menuName,
      category: baseMenu.category,
      displayOrder: comp.displayOrder,
      baseMenuCode: comp.baseMenuCode,
    });

    for (const ct of DERIVED_CRUST_TYPES) {
      const base = rawMap[`${comp.baseMenuCode}__${ct}`] || {};
      derivedRawMap[`${comp.menuCode}__${ct}`] = { ...base };
    }
  }

  return {
    menus: [...menus, ...derivedMenus],
    rawMap: { ...rawMap, ...derivedRawMap },
  };
}
