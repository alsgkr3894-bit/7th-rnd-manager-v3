/**
 * lib/backup/local-storage-keys.js — 백업/복원에 포함할 영속 설정 localStorage 키 중앙 목록
 *
 * 옵션 (a) 정책: 사용자가 의도적으로 구성한 영속 설정만 포함.
 * 포함 기준: 설정값·표시순서·임계값·사용자 데이터(핀·프리셋·체크리스트)
 * 제외 기준: 검색어·필터·초안·내비게이션 상태·보안 토큰·기기별 시스템 메타
 *
 * 신규 설정 추가 시 PERSISTENT_LS_KEYS와 필요한 scope map에 추가하면 자동으로 백업/복원에 반영된다.
 */

import { SETTING_LS_KEYS } from '@/lib/settings';
import {
  ACTIVE_ACCOUNT_KEY,
  activeAccountKeyForBrand,
  isActiveAccountStorageKey,
} from '@/lib/auth/account-constants';
import { BRAND_MASTER_KEY, mergeBrandMasterFromBackup } from '@/lib/brand-master';

export const SAVED_VIEW_LS_PREFIX = 'saved_views_v1';
const SAVED_VIEW_LS_KEY_RE = /^saved_views_v1(?:_default)?__[a-z0-9-]+__[A-Za-z0-9:_-]+$/;
const MAX_DYNAMIC_STORAGE_SCAN_KEYS = 2000;
const MAX_IMPORT_STORAGE_KEYS = 2000;

export function isSavedViewStorageKey(key) {
  return typeof key === 'string' && SAVED_VIEW_LS_KEY_RE.test(key);
}

/** 영양성분 출력 설정 — 하위 호환 export 유지 */
export const NUTRITION_LS_KEYS = [
  'v3:nutrition-menu-name-override',
  'v3:nutrition-label-menu-name-override',
  'v3:nutrition-menu-order',
  'v3:nutrition-label-menu-order',
  'v3:nutrition-allergen-menu-order',
  'v3:nutrition-allergen-order',
  'v3:nutrition-ingredient-name-override',
  'v3:nutrition-slice-config',
  'v3:nutrition-import-aliases',
];

export const ACCOUNT_LS_KEYS = [ACTIVE_ACCOUNT_KEY, activeAccountKeyForBrand('main')];

/**
 * 전체 영속 설정 키 목록 (B-14 정책 (a): 영속 설정만).
 * exportSelected / importAll 이 이 목록을 기준으로 수집·복원한다.
 */
export const PERSISTENT_LS_KEYS = [
  // 영양성분 출력 설정
  'v3:nutrition-menu-name-override',
  'v3:nutrition-label-menu-name-override',
  'v3:nutrition-menu-order',
  'v3:nutrition-label-menu-order',
  'v3:nutrition-allergen-menu-order',
  'v3:nutrition-allergen-order',
  'v3:nutrition-ingredient-name-override',
  'v3:nutrition-slice-config',
  'v3:nutrition-import-aliases',

  // 메뉴개발노트 설정
  'v3:note-sort',
  'v3:note-view',
  'v3:note-pins',
  'v3:note-presets',
  'v3:note-calendar-checklist',
  'v3:note_lastCategory',

  // 식자재 이슈 및 테스트 /샘플기록 설정
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
  'v3:home-todo-done',

  // 보고서/월마감 운영 이력
  'monthly_close_log_v1',

  // 제때(shipment) 설정
  'v3:jette-settings',

  // 앱 전역 설정
  ...SETTING_LS_KEYS,
  'v3:sidebar-open',
  'v3:palette-recent',
  'v3:palette-favorites',
  'v3:profile',
  BRAND_MASTER_KEY,
  ...ACCOUNT_LS_KEYS,
];

export const LOCAL_STORAGE_KEYS_BY_SCOPE = {
  nutrition: NUTRITION_LS_KEYS,
  notes: [
    'v3:note-sort',
    'v3:note-view',
    'v3:note-pins',
    'v3:note-presets',
    'v3:note-calendar-checklist',
    'v3:note_lastCategory',
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
  'v3:home-todo-done',
  'monthly_close_log_v1',
  ...SETTING_LS_KEYS,
  'v3:sidebar-open',
  'v3:palette-recent',
  'v3:palette-favorites',
  'v3:profile',
  BRAND_MASTER_KEY,
  ...ACCOUNT_LS_KEYS,
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

function allowsSavedViewStorageKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return false;
  if (keys === PERSISTENT_LS_KEYS) return true;
  const keySet = new Set(keys);
  return COMMON_LS_KEYS.every(key => keySet.has(key));
}

function readOwnString(map, key) {
  if (!Object.prototype.hasOwnProperty.call(map, key)) return null;
  try {
    const value = map[key];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function isAllowedDynamicStorageKey(key, { allowAccountKeys, allowSavedViewKeys }) {
  return (
    (allowAccountKeys && isActiveAccountStorageKey(key)) ||
    (allowSavedViewKeys && isSavedViewStorageKey(key))
  );
}

function forEachAllowedDynamicStorageEntry(map, keys, flags, onEntry) {
  const staticKeys = new Set(keys);
  let inspected = 0;
  let truncated = false;
  for (const key in map) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    inspected += 1;
    if (inspected > MAX_IMPORT_STORAGE_KEYS) {
      truncated = true;
      break;
    }
    if (staticKeys.has(key) || !isAllowedDynamicStorageKey(key, flags)) continue;
    const value = readOwnString(map, key);
    if (value != null) onEntry(key, value);
  }
  return truncated;
}

export function pickLocalStorageForScopes(map, scopes = []) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return undefined;
  const keys = persistentLocalStorageKeysForScopes(scopes);
  const allowAccountKeys = keys.some(isActiveAccountStorageKey);
  const allowSavedViewKeys = allowsSavedViewStorageKeys(keys);
  const picked = {};
  for (const key of keys) {
    const value = readOwnString(map, key);
    if (value != null) {
      picked[key] = value;
    }
  }
  forEachAllowedDynamicStorageEntry(
    map,
    keys,
    { allowAccountKeys, allowSavedViewKeys },
    (key, value) => {
      picked[key] = value;
    }
  );
  return Object.keys(picked).length > 0 ? picked : undefined;
}

function collectDynamicLocalStorageKeys(out, predicate) {
  if (typeof localStorage === 'undefined' || typeof localStorage.key !== 'function') return;
  let length = 0;
  try {
    length = Number(localStorage.length) || 0;
  } catch {
    return;
  }
  const limit = Math.min(length, MAX_DYNAMIC_STORAGE_SCAN_KEYS);
  for (let i = 0; i < limit; i += 1) {
    let key = null;
    try {
      key = localStorage.key(i);
    } catch {
      continue;
    }
    if (!predicate(key)) continue;
    try {
      const value = localStorage.getItem(key);
      if (value != null) out[key] = value;
    } catch (err) {
      void err;
    }
  }
}

/** 주어진 키 목록의 현재 localStorage 값을 { key: value } 로 수집 (없는 키는 제외) */
export function collectLocalStorage(keys = PERSISTENT_LS_KEYS) {
  if (typeof localStorage === 'undefined') return {};
  const out = {};
  const allowAccountKeys = keys.some(isActiveAccountStorageKey);
  const allowSavedViewKeys = allowsSavedViewStorageKeys(keys);
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    } catch {}
  }
  if (allowAccountKeys) collectDynamicLocalStorageKeys(out, isActiveAccountStorageKey);
  if (allowSavedViewKeys) collectDynamicLocalStorageKeys(out, isSavedViewStorageKey);
  return out;
}

/**
 * 백업의 localStorage 섹션을 복원 (알려진 키만 setItem)
 *
 * options.mergeBrandMaster: BRAND_MASTER_KEY를 덮어쓰지 않고 병합(복원 이후 새 브랜드 보존).
 * options.skipAccountKeys: 활성 계정 키를 복원하지 않음(로그인 계정이 조용히 바뀌는 것 방지).
 * 두 옵션은 명시적 opt-in이라 기존 round-trip 동작(기본값)은 그대로 유지된다.
 */
export function restoreLocalStorage(map, keys = PERSISTENT_LS_KEYS, options = {}) {
  if (typeof localStorage === 'undefined' || !map || typeof map !== 'object') return 0;
  let n = 0;
  const mergeBrandMaster = options.mergeBrandMaster === true;
  const skipAccountKeys = options.skipAccountKeys === true;
  const allowAccountKeys = !skipAccountKeys && keys.some(isActiveAccountStorageKey);
  const allowSavedViewKeys = allowsSavedViewStorageKeys(keys);
  const restoreEntry = (k, v) => {
    if (skipAccountKeys && isActiveAccountStorageKey(k)) return;
    if (mergeBrandMaster && k === BRAND_MASTER_KEY) {
      try {
        mergeBrandMasterFromBackup(v);
        n += 1;
      } catch (err) {
        options.onError?.({ key: k, error: err?.message || String(err) });
      }
      return;
    }
    try {
      localStorage.setItem(k, v);
      n += 1;
    } catch (err) {
      options.onError?.({ key: k, error: err?.message || String(err) });
    }
  };
  for (const k of keys) {
    const v = readOwnString(map, k);
    if (v != null) restoreEntry(k, v);
  }
  const truncated = forEachAllowedDynamicStorageEntry(
    map,
    keys,
    { allowAccountKeys, allowSavedViewKeys },
    restoreEntry
  );
  if (truncated) {
    options.onError?.({
      key: '*',
      error: `localStorage 복원 입력이 너무 커서 ${MAX_IMPORT_STORAGE_KEYS}개까지만 확인했습니다`,
    });
  }
  return n;
}
