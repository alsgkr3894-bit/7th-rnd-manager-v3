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

/** 설정 정의: 키 + 기본값 + 적용 함수 */
const SETTINGS = {
  theme: {
    default: 'light',
    apply: (value) => {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = value;
      }
    },
  },
  density: {
    default: 'normal',
    apply: (value) => {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.density = value;
      }
    },
  },
  notifications: {
    default: 'on',
    apply: () => {}, // 향후 알림 시스템 연동 예정
  },
};

/** 설정 1개 읽기 (localStorage → 기본값) */
export function getSetting(key) {
  const def = SETTINGS[key]?.default;
  if (typeof localStorage === 'undefined') return def;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ?? def;
  } catch {
    return def;
  }
}

/** 설정 1개 쓰기 (localStorage 저장 + 즉시 적용) */
export function setSetting(key, value) {
  const cfg = SETTINGS[key];
  if (!cfg) {
    console.warn(`[settings] 알 수 없는 키: ${key}`);
    return;
  }
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {}
  cfg.apply(value);
}

/** 전체 설정을 localStorage에서 읽어 dataset 등에 적용 (AppShell mount 시 호출) */
export function applyAllSettings() {
  for (const key of Object.keys(SETTINGS)) {
    const value = getSetting(key);
    SETTINGS[key].apply(value);
  }
}

/** 사용 가능한 설정 키 목록 */
export const SETTING_KEYS = Object.keys(SETTINGS);
