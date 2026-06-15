/**
 * lib/nutrition/backup-keys.js — 백업/복원에 포함할 영속 설정 localStorage 키 중앙 목록
 *
 * 옵션 (a) 정책: 사용자가 의도적으로 구성한 영속 설정만 포함.
 * 포함 기준: 설정값·표시순서·임계값·사용자 데이터(핀·프리셋·체크리스트)
 * 제외 기준: 검색어·필터·초안·내비게이션 상태·보안 토큰·기기별 시스템 메타
 *
 * 신규 설정 추가 시 PERSISTENT_LS_KEYS에만 추가하면 자동으로 백업/복원에 반영된다.
 */

/** 영양성분 출력 설정 (기존 6종 — 하위 호환 export 유지) */
export const NUTRITION_LS_KEYS = [
  'v3:nutrition-menu-name-override',
  'v3:nutrition-menu-order',
  'v3:nutrition-allergen-menu-order',
  'v3:nutrition-allergen-order',
  'v3:nutrition-ingredient-name-override',
  'v3:nutrition-slice-config',
];

/**
 * 전체 영속 설정 키 목록 (B-14 정책 (a): 영속 설정만).
 * exportSelected / importAll 이 이 목록을 기준으로 수집·복원한다.
 */
export const PERSISTENT_LS_KEYS = [
  // 영양성분 출력 설정
  'v3:nutrition-menu-name-override',
  'v3:nutrition-menu-order',
  'v3:nutrition-allergen-menu-order',
  'v3:nutrition-allergen-order',
  'v3:nutrition-ingredient-name-override',
  'v3:nutrition-slice-config',

  // 메뉴개발노트 설정
  'v3:note-sort',
  'v3:note-view',
  'v3:note-pins',
  'v3:note-presets',
  'v3:note-calendar-checklist',

  // 샘플기록 설정
  'v3:sample-sort',
  'v3:sample-view',

  // 원가·레시피 설정
  'v3:recipe-sort',
  'v3:cost-platforms',
  'v3:margin-cost-warn',
  'v3:margin-cost-crit',

  // 식자재 설정
  'v3:ingredient-usage-hidden',
  'v3:ingredient-usage-excl-menus',
  'v3:ingredient_lastUnitType',

  // 홈 대시보드 설정
  'v3:home-widgets',
  'v3:home-widget-collapsed',
  'v3:home-widget-order',
  'v3:home-widget-favorites',
  'v3:home-widget-fav-only',

  // 제때(shipment) 설정
  'v3:jette-settings',

  // 앱 전역 설정
  'v3:theme',
  'v3:sidebar-open',
  'v3:palette-recent',
  'v3:profile',
];

export const LOCAL_STORAGE_KEYS_BY_SCOPE = {
  nutrition: NUTRITION_LS_KEYS,
  notes: [
    'v3:note-sort',
    'v3:note-view',
    'v3:note-pins',
    'v3:note-presets',
    'v3:note-calendar-checklist',
    'v3:sample-sort',
    'v3:sample-view',
  ],
  cost: [
    'v3:recipe-sort',
    'v3:cost-platforms',
    'v3:margin-cost-warn',
    'v3:margin-cost-crit',
    'v3:ingredient-usage-hidden',
    'v3:ingredient-usage-excl-menus',
    'v3:ingredient_lastUnitType',
  ],
  jette: ['v3:jette-settings'],
  sales: [],
};

export const COMMON_LS_KEYS = [
  'v3:home-widgets',
  'v3:home-widget-collapsed',
  'v3:home-widget-order',
  'v3:home-widget-favorites',
  'v3:home-widget-fav-only',
  'v3:theme',
  'v3:sidebar-open',
  'v3:palette-recent',
  'v3:profile',
];

export function persistentLocalStorageKeysForScopes(scopes = []) {
  const selected = Array.isArray(scopes) ? scopes : [];
  if (selected.length === 0) return [];
  const allowed = new Set(COMMON_LS_KEYS);
  for (const scope of selected) {
    for (const key of LOCAL_STORAGE_KEYS_BY_SCOPE[scope] || []) {
      allowed.add(key);
    }
  }
  return PERSISTENT_LS_KEYS.filter(key => allowed.has(key));
}

export function pickLocalStorageForScopes(map, scopes = []) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return undefined;
  const keys = persistentLocalStorageKeysForScopes(scopes);
  const allowed = new Set(keys);
  const picked = {};
  for (const [key, value] of Object.entries(map)) {
    if (allowed.has(key) && typeof value === 'string') picked[key] = value;
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

/** 주어진 키 목록의 현재 localStorage 값을 { key: value } 로 수집 (없는 키는 제외) */
export function collectLocalStorage(keys = PERSISTENT_LS_KEYS) {
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
export function restoreLocalStorage(map, keys = PERSISTENT_LS_KEYS) {
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
