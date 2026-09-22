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

/**
 * 메뉴마스터에서 메뉴명을 바꿨을 때, 출력용 오버라이드가 "예전 마스터명"을 그대로 들고 있으면
 * 지운다 — 남겨 두면 원산지·알레르기·영양성분표 출력에 옛 이름이 계속 나온다
 * (2026-09-22: "(1인용)"→"(1인)" 변경이 표출력에 반영되지 않던 문제). 공백·"피자" 단어만
 * 다른 변형("하와이안 (1인용)")도 예전 마스터명으로 본다. 그 외 사용자가 직접 다른
 * 이름으로 바꿔 둔 오버라이드는 건드리지 않는다.
 * @returns {number} 지운 항목 수
 */
// 공백·"피자" 단어 차이만 있는 출력명은 마스터명을 손본 변형으로 본다
// (예: 마스터 "하와이안 피자(1인용)" ↔ 출력명 "하와이안 (1인용)").
function menuNameVariantKey(name) {
  return String(name || '')
    .replace(/피자/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function clearStaleMenuNameOverrides(menuCodes, previousName) {
  const prev = menuNameVariantKey(previousName);
  const codes = (Array.isArray(menuCodes) ? menuCodes : [menuCodes]).map(c =>
    String(c || '').trim()
  );
  if (!prev || !codes.some(Boolean)) return 0;
  let cleared = 0;
  for (const [load, save] of [
    [loadMenuNames, saveMenuNames],
    [loadLabelMenuNames, saveLabelMenuNames],
  ]) {
    const map = load();
    let changed = false;
    for (const code of codes) {
      if (code && typeof map[code] === 'string' && menuNameVariantKey(map[code]) === prev) {
        delete map[code];
        changed = true;
        cleared += 1;
      }
    }
    if (changed) save(map);
  }
  return cleared;
}
