/**
 * lib/nutrition/menu-name-override.js
 * 출력용 메뉴명 오버라이드 — localStorage 기반, 원산지·알레르기·표출력 공유.
 * { [menuCode]: '출력용 이름' } 형태로 저장.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const KEY = 'v3:nutrition-menu-name-override';

export function loadMenuNames() {
  const val = getJSONLS(KEY);
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
}

export function saveMenuNames(map) {
  setJSONLS(KEY, typeof map === 'object' && !Array.isArray(map) ? map : {});
}

/** override 있으면 그 값, 없으면 원래 이름 */
export function applyMenuName(menuCode, originalName, overrides) {
  if (!overrides || !menuCode) return originalName;
  const ov = overrides[menuCode];
  return ov != null && ov.trim() !== '' ? ov.trim() : originalName;
}
