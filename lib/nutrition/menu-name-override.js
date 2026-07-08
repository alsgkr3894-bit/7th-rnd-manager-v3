/**
 * lib/nutrition/menu-name-override.js
 * 출력용 메뉴명 오버라이드 — localStorage 기반.
 *
 * 원산지·알레르기 출력명과 영양성분표 출력명은 서로 다른 업무 맥락이라
 * 별도 키로 저장한다. 기존 KEY는 원산지·알레르기 호환용으로 유지한다.
 * { [menuCode]: '출력용 이름' } 형태로 저장.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

export const MENU_NAME_OVERRIDE_KEY = 'v3:nutrition-menu-name-override';
export const LABEL_MENU_NAME_OVERRIDE_KEY = 'v3:nutrition-label-menu-name-override';

function normalizeNameMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
  );
}

export function loadMenuNames() {
  const val = getJSONLS(MENU_NAME_OVERRIDE_KEY);
  return normalizeNameMap(val);
}

export function saveMenuNames(map) {
  setJSONLS(MENU_NAME_OVERRIDE_KEY, normalizeNameMap(map));
}

export function loadLabelMenuNames() {
  const val = getJSONLS(LABEL_MENU_NAME_OVERRIDE_KEY);
  return normalizeNameMap(val);
}

export function saveLabelMenuNames(map) {
  setJSONLS(LABEL_MENU_NAME_OVERRIDE_KEY, normalizeNameMap(map));
}

/** override 있으면 그 값, 없으면 원래 이름 */
export function applyMenuName(menuCode, originalName, overrides) {
  if (!overrides || !menuCode) return originalName;
  const ov = overrides[menuCode];
  return typeof ov === 'string' && ov.trim() !== '' ? ov.trim() : originalName;
}
