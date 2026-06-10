/**
 * lib/nutrition/slice-config.js — 피자 조각수 설정 (localStorage 기반)
 *
 * 조각 단위 영양성분 출력에서 "한판 = 몇 조각"인지 메뉴별로 관리한다.
 * 기본값: 피자 8조각 (L/R 공통). 예외는 메뉴별 오버라이드.
 * { [menuCode]: { L: number, R: number } } 형태로 저장.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';

export const SLICE_CONFIG_KEY = 'v3:nutrition-slice-config';

export function loadSliceCounts() {
  const val = getJSONLS(SLICE_CONFIG_KEY);
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
}

export function saveSliceCounts(map) {
  setJSONLS(SLICE_CONFIG_KEY, map && typeof map === 'object' && !Array.isArray(map) ? map : {});
}

/** 메뉴 기본 조각수 — 피자류 기본 8조각 */
export function defaultSlices(menu, masterByCode = {}) {
  return { L: 8, R: 8 };
}

/**
 * 특정 메뉴·사이드(L/R)의 조각수 — 오버라이드 우선, 없으면 기본값.
 * @param {string} side 'L' | 'R'
 */
export function resolveSlices(menuCode, side, map, menu, masterByCode = {}) {
  const def = defaultSlices(menu, masterByCode);
  const ov = map?.[menuCode];
  const v = ov && Number(ov[side]) > 0 ? Number(ov[side]) : null;
  return v ?? def[side] ?? 8;
}
