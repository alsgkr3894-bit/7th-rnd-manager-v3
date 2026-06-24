/**
 * lib/settings.js — 사용자 환경 설정 (localStorage 기반)
 *
 * 다크모드/밀도/알림 등 UI 설정 저장 및 즉시 적용.
 * Provider 같은 큰 구조 없이 localStorage + dataset 직접 조작 (단순화).
 *
 * 사용:
 *   import { getSetting, setSetting, applyAllSettings } from '@/lib/settings';
 *   const theme = getSetting('theme');         // 'light' | 'dark'
 *   setSetting('theme', 'dark');               // localStorage + dataset 즉시 적용
 *   applyAllSettings();                        // 페이지 진입 시 (AppShell)
 */

const PREFIX = 'v3:';
export const SETTING_CHANGED_EVENT = 'v3:setting-changed';

/**
 * 설정 정의: 키 + 기본값 + 적용 함수
 *
 * - UI 설정 (theme, density): apply가 dataset 변경
 * - 정책/알림 설정: apply는 no-op (저장만, 실제 사용은 해당 모듈에서 getSetting 호출)
 * - autoRecalc/strictPosting/roundMode는 백업 호환용 key다.
 *   현재 화면에서는 실제 동작과 어긋나지 않도록 고정/준비 상태로 표시한다.
 */
const SETTINGS = {
  // UI
  theme: {
    default: 'light',
    values: ['light', 'dark'],
    apply: v => setDataset('theme', v),
  },
  density: {
    default: 'normal',
    values: ['normal', 'compact'],
    apply: v => setDataset('density', v),
  },
  fontScale: {
    default: 'normal',
    values: ['normal', 'large', 'xlarge'],
    apply: v => setDataset('fontScale', v),
  },
  keyboardShortcuts: {
    default: 'on',
    values: ['on', 'off'],
    apply: () => {},
  },

  // 원가 계산 정책 호환 key (현재 원가 화면은 자동 반영, 단가는 1자리 반올림 고정)
  autoRecalc: {
    default: 'on',
    values: ['on', 'off'],
    apply: () => {},
  },
  strictPosting: {
    default: 'on',
    values: ['on', 'off'],
    apply: () => {},
  },
  roundMode: {
    default: 'round',
    values: ['round', 'ceil', 'floor'],
    apply: () => {},
  },

  // 알림 (홈 대시보드 등에서 참조)
  unmatchedAlert: {
    default: 'on',
    values: ['on', 'off'],
    apply: () => {},
  },
  costRateAlert: {
    default: 'on',
    values: ['on', 'off'],
    apply: () => {},
  },
};

export const SETTING_KEYS = Object.keys(SETTINGS);
export const SETTING_LS_KEYS = SETTING_KEYS.map(key => PREFIX + key);

export function settingStorageKey(key) {
  return PREFIX + key;
}

function setDataset(key, value) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset[key] = value;
  }
}

function normalizeSettingValue(key, value) {
  const cfg = SETTINGS[key];
  if (!cfg) return value;
  if (!cfg.values) return value ?? cfg.default;
  return cfg.values.includes(value) ? value : cfg.default;
}

/** 설정 1개 읽기 (localStorage → 기본값) */
export function getSetting(key) {
  const def = SETTINGS[key]?.default;
  if (typeof localStorage === 'undefined') return def;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return normalizeSettingValue(key, raw ?? def);
  } catch {
    return def;
  }
}

/** 설정 1개 쓰기 (localStorage 저장 + 즉시 적용) */
export function setSetting(key, value) {
  const cfg = SETTINGS[key];
  if (!cfg) {
    if (process.env.NODE_ENV === 'development') console.warn(`[settings] 알 수 없는 키: ${key}`);
    return;
  }
  const safeValue = normalizeSettingValue(key, value);
  try {
    localStorage.setItem(PREFIX + key, safeValue);
  } catch {}
  cfg.apply(safeValue);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const EventCtor = typeof CustomEvent === 'function' ? CustomEvent : window.CustomEvent || null;
    if (EventCtor) {
      window.dispatchEvent(
        new EventCtor(SETTING_CHANGED_EVENT, { detail: { key, value: safeValue } })
      );
    }
  }
}

/** 전체 설정을 localStorage에서 읽어 dataset 등에 적용 (AppShell mount 시 호출) */
export function applyAllSettings() {
  for (const key of SETTING_KEYS) {
    const value = getSetting(key);
    SETTINGS[key].apply(value);
  }
}
