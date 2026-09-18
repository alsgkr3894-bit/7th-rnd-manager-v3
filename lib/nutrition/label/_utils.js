/**
 * 영양성분표 빌더 공통 유틸리티 — 시트 빌더에서 내부적으로 import한다.
 */
import { addNutrition, combineBaseWithEdge } from '@/lib/nutrition/values/store';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';
import {
  NUTRITION_GROUP_ORDER,
  isPersonalPizzaMenu,
  resolveNutritionGroup,
} from '@/lib/nutrition/menu-group';
import { allergenNames } from '@/lib/nutrition/allergen/aggregate';
import { applyMenuEdgeAllergenRules } from '@/lib/nutrition/allergen/rules';
import {
  PERSONAL_PIZZA_CRUST_CODE,
  PERSONAL_PIZZA_CRUST_LABEL,
  SERVING_CRUST_TYPE,
  THIN_CRUST_CODE,
  THIN_CRUST_LABEL,
} from '@/lib/nutrition/crust-config';
import { resolveSlices } from '@/lib/nutrition/slice-config';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { applyOrder } from '@/lib/nutrition/order';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';

export { addNutrition, combineBaseWithEdge, calcSetMinMax, calcHalfMinMax };
export { isPersonalPizzaMenu, resolveNutritionGroup };
export { allergenNames };
export { THIN_CRUST_CODE, THIN_CRUST_LABEL };
export { PERSONAL_PIZZA_CRUST_CODE, PERSONAL_PIZZA_CRUST_LABEL };
export { SERVING_CRUST_TYPE };
export { resolveSlices };
export { asDisplayText, asObjectArray };
export { getMenuCodeRank };

export const LABEL_COLS = [
  { key: 'weight', label: '1회 중량', unit: 'g' },
  { key: 'kcal', label: '열량', unit: 'kcal' },
  { key: 'sugar', label: '당류', unit: 'g' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'fat', label: '포화지방', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
];

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

/**
 * 출력 열 → 원본 필드. "포화지방" 열(key 'fat')은 satFat만 쓴다.
 * 예전엔 satFat이 비면 조지방(fat)으로 대체했는데, 총지방을 포화지방으로 표시하는 것이라
 * 법정 영양표시에서 허용되지 않는다 — 미입력은 빈값("—")으로 두고 입력을 유도한다.
 */
export function labelFieldValue(raw, key) {
  if (key !== 'fat') return raw?.[key];
  return raw?.satFat;
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
    rawMap[`${menuCode}__${PERSONAL_PIZZA_CRUST_CODE}`] ||
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

export function allergenText(
  menuAllergenMap,
  edgeAllergenMap,
  menuCode,
  edgeCode = null,
  menuName = ''
) {
  const merged = mergeCodeSets(
    menuAllergenMap?.get(menuCode),
    edgeCode ? edgeAllergenMap?.get(edgeCode) : null
  );
  // 도우 자체가 달라 특정 메뉴의 특정 크러스트만 알레르기가 달라지는 예외
  // (기본 레시피 알레르기까지 뺄 수 있어 위 mergeCodeSets 이후에 적용해야 한다).
  const adjusted = edgeCode
    ? applyMenuEdgeAllergenRules(menuCode, menuName, edgeCode, merged)
    : merged;
  return allergenNames(adjusted);
}

// 이름은 토핑 전용처럼 보이지만 실제로는 "총량으로 저장된(100g 환산 없는) 값을 그대로
// 반올림해 보여준다"는 규칙이라 nutrition_edge_master 같은 다른 총량 저장 store에도
// 그대로 재사용한다(menu-preview.js 엣지 미리보기 참고).
export function toppingValue(raw, key) {
  const value = labelFieldValue(raw, key);
  return value === '' || value == null ? '—' : roundLabelValue(value);
}

/**
 * 추가토핑은 nutrition_topping_master 자체 displayOrder를 기본값으로 쓰되,
 * "출력명·순서" 편집에서 저장한 toppingOrder(카테고리 전용 순서 키)가 있으면 그것을 우선한다.
 */
export function buildToppingMasterRows(
  toppings,
  toppingAllergenMap,
  toppingOrder = [],
  nameOverrides = {}
) {
  const ordered = applyOrder(
    asObjectArray(toppings),
    toppingOrder,
    t => asDisplayText(t.toppingCode),
    t => asDisplayText(t.toppingName),
    t => (Number.isFinite(t?.displayOrder) ? t.displayOrder : 999)
  );
  return ordered.map(topping => {
    const toppingCode = asDisplayText(topping.toppingCode);
    const originalName = asDisplayText(topping.toppingName, toppingCode || '추가토핑');
    return {
      menuName: applyMenuName(toppingCode, originalName, nameOverrides),
      originalMenuName: originalName,
      menuCode: toppingCode,
      // 사용자가 토핑 편집 화면에서 직접 연결한 메뉴마스터(T-*) 코드 — menuCode(토핑 자체
      // 코드)와는 다른 코드 체계라 별도 필드로 둔다. 메뉴마스터 미리보기(menu-preview.js)가
      // 이름 대신 이 코드로 먼저 매칭을 시도한다.
      linkedMenuCode: asDisplayText(topping.menuCode),
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

/**
 * 1회 제공량(조각 수) 산출 — 1조각 중량이 100g 이상이면 1조각.
 * 100g 미만이면 2조각으로 묶고, 2조각 합산 중량도 100g 미만이면 3조각으로 묶는다.
 */
export function servingSlices(perSliceWeight, slice) {
  if (!(perSliceWeight > 0)) return slice || 1;
  if (perSliceWeight >= 100) return 1;
  const n = perSliceWeight * 2 < 100 ? 3 : 2;
  return Math.min(n, slice || n);
}
