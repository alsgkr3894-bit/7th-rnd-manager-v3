/**
 * lib/nutrition/menu-name-override.js
 * 출력용 메뉴명 오버라이드 — localStorage 기반, 원산지·알레르기·표출력 공유.
 * { [menuCode]: '출력용 이름' } 형태로 저장.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const KEY = 'v3:nutrition-menu-name-override';

function normalizeNameMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
  );
}

export function loadMenuNames() {
  const val = getJSONLS(KEY);
  return normalizeNameMap(val);
}

export function saveMenuNames(map) {
  setJSONLS(KEY, normalizeNameMap(map));
}

/** override 있으면 그 값, 없으면 원래 이름 */
export function applyMenuName(menuCode, originalName, overrides) {
  if (!overrides || !menuCode) return originalName;
  const ov = overrides[menuCode];
  return typeof ov === 'string' && ov.trim() !== '' ? ov.trim() : originalName;
}
