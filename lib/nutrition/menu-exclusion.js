/**
 * lib/nutrition/menu-exclusion.js — 원산지·알레르기 출력에서 제외할 메뉴 집합
 *
 * 메뉴마스터의 excludeFromOrigin 플래그가 켜진 항목을 menuCode·menuName 두 기준으로
 * 모은다. (레시피 코드와 메뉴마스터 코드가 다르거나 L/R 사이즈별 레코드인 경우 대비)
 */

/** @returns {{excludedMenuCodes: Set<string>, excludedMenuNames: Set<string>}} */
export function extractExcludedMenuSets(menuMasters) {
  const ex = (menuMasters || []).filter(m => m.excludeFromOrigin);
  return {
    excludedMenuCodes: new Set(ex.map(m => m.menuCode).filter(Boolean)),
    excludedMenuNames: new Set(ex.map(m => (m.menuName || '').trim()).filter(Boolean)),
  };
}
