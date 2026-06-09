/**
 * lib/nutrition/backup-keys.js — 백업/복원에 포함할 영양성분 localStorage 키 중앙 목록
 *
 * IndexedDB 스토어(nutrition_*)는 자동 백업되지만 출력 설정(메뉴명·순서·조각수 등)은
 * localStorage에 저장되어 별도로 백업/복원해야 한다. 신규 설정 추가 시 이 목록만 갱신.
 */
export const NUTRITION_LS_KEYS = [
  'v3:nutrition-menu-name-override',
  'v3:nutrition-menu-order',
  'v3:nutrition-allergen-menu-order',
  'v3:nutrition-allergen-order',
  'v3:nutrition-ingredient-name-override',
  'v3:nutrition-slice-config',
];

/** 주어진 키 목록의 현재 localStorage 값을 { key: value } 로 수집 (없는 키는 제외) */
export function collectLocalStorage(keys = NUTRITION_LS_KEYS) {
  if (typeof localStorage === 'undefined') return {};
  const out = {};
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    } catch {}
  }
  return out;
}

/** 백업의 localStorage 섹션을 복원 (알려진 키만 setItem) */
export function restoreLocalStorage(map, keys = NUTRITION_LS_KEYS) {
  if (typeof localStorage === 'undefined' || !map || typeof map !== 'object') return 0;
  let n = 0;
  const allow = new Set(keys);
  for (const [k, v] of Object.entries(map)) {
    if (!allow.has(k) || typeof v !== 'string') continue;
    try {
      localStorage.setItem(k, v);
      n += 1;
    } catch {}
  }
  return n;
}
