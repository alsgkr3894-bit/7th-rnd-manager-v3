/**
 * lib/nutrition/menu-exclusion.js — 원산지·알레르기 출력에서 제외할 메뉴 집합
 *
 * 두 가지를 menuCode·menuName 기준으로 모은다(레시피 코드와 메뉴마스터 코드가 다르거나
 * L/R 사이즈별 레코드인 경우 대비):
 *   1. 메뉴마스터의 excludeFromOrigin 플래그가 켜진 항목
 *   2. 메뉴마스터에서 단종(status='discontinued')된 항목 — 단종되면 표시판·표에서 자동 제외
 *      (2026-09-16 사용자 결정). 이름 기준 제외는 그 이름을 쓰는 마스터 행이 **전부** 단종일
 *      때만 — L은 판매 중인데 R만 단종이면 이름이 같아 L까지 사라지기 때문.
 */

import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function isDiscontinuedMenuMaster(menu) {
  return asDisplayText(menu?.status) === 'discontinued';
}

/** @returns {{excludedMenuCodes: Set<string>, excludedMenuNames: Set<string>}} */
export function extractExcludedMenuSets(menuMasters) {
  const masters = asObjectArray(menuMasters);
  const excludedMenuCodes = new Set();
  const excludedMenuNames = new Set();

  for (const m of masters.filter(m => m.excludeFromOrigin)) {
    const code = asDisplayText(m.menuCode);
    const name = asDisplayText(m.menuName).trim();
    if (code) excludedMenuCodes.add(code);
    if (name) excludedMenuNames.add(name);
  }

  const statusesByName = new Map();
  for (const m of masters) {
    const name = asDisplayText(m.menuName).trim();
    if (!name) continue;
    if (!statusesByName.has(name)) statusesByName.set(name, []);
    statusesByName.get(name).push(isDiscontinuedMenuMaster(m));
  }
  for (const m of masters.filter(isDiscontinuedMenuMaster)) {
    const code = asDisplayText(m.menuCode);
    if (code) excludedMenuCodes.add(code);
    const name = asDisplayText(m.menuName).trim();
    if (name && statusesByName.get(name).every(Boolean)) excludedMenuNames.add(name);
  }

  return { excludedMenuCodes, excludedMenuNames };
}
