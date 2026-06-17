/**
 * lib/nutrition/missing-values.js — 영양성분 미입력 메뉴 진단 (순수 함수)
 *
 * nutrition_menu_ref에 등록됐지만 어떤 크러스트에도 영양값이 하나도 없는 메뉴를 찾는다.
 * (= "기본값 없음" — 출력 시 빈 값이 되는 메뉴를 사용자에게 미리 안내)
 *
 * rawMap 키는 `${menuCode}__${crustType}` 형식. 메뉴코드 단위로 묶어, 해당 메뉴의
 * 어떤 크러스트 행에도 값이 없으면 미입력으로 판단한다. (오탐을 줄이려 "전혀 없음"만 진단)
 */

export const NUTRITION_VALUE_FIELDS = [
  'weight',
  'kcal',
  'carbs',
  'sugar',
  'fat',
  'satFat',
  'transFat',
  'cholesterol',
  'protein',
  'sodium',
];

/** 영양값 행에 실제 입력된 값이 하나라도 있으면 true */
export function hasNutritionValue(row) {
  return NUTRITION_VALUE_FIELDS.some(key => row?.[key] !== '' && row?.[key] != null);
}

/** rawMap 키(`code__crust`)에서 메뉴코드 추출 */
function menuCodeOfKey(key) {
  const k = String(key || '');
  const sep = k.indexOf('__');
  return sep === -1 ? k : k.slice(0, sep);
}

/**
 * 영양값이 전혀 입력되지 않은 메뉴 진단.
 * @param {{ menus?: object[], rawMap?: Record<string, object> }} params
 *   menus: nutrition_menu_ref 목록(각 { menuCode, menuName }), rawMap: `code__crust` → 값 행
 * @returns {{ missingMenus: {menuCode:string, menuName:string}[], missingCount: number }}
 */
export function buildNutritionMissingValueDiagnostics({ menus, rawMap } = {}) {
  const safeMenus = Array.isArray(menus) ? menus : [];
  const map = rawMap && typeof rawMap === 'object' ? rawMap : {};

  // 값이 하나라도 있는 메뉴코드 집합
  const codesWithValue = new Set();
  for (const [key, row] of Object.entries(map)) {
    const code = menuCodeOfKey(key);
    if (code && hasNutritionValue(row)) codesWithValue.add(code);
  }

  const missingMenus = [];
  const seen = new Set();
  for (const menu of safeMenus) {
    const code = String(menu?.menuCode || '').trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    if (!codesWithValue.has(code)) {
      missingMenus.push({ menuCode: code, menuName: String(menu?.menuName || '').trim() });
    }
  }
  return { missingMenus, missingCount: missingMenus.length };
}
