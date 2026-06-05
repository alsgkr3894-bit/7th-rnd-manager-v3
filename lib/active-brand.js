/**
 * lib/active-brand.js — 현재 활성 브랜드(멀티 브랜드) 식별
 *
 * 브랜드별로 별도 IndexedDB를 쓰기 위한 단일 출처.
 * localStorage에 브랜드 id만 저장하고, 전환 시 페이지를 새로고침해
 * 모든 모듈이 활성 브랜드 DB로 재초기화되게 한다(전파 복잡성 제거).
 *
 * 브랜드 메타(이름·로고·색)는 lib/companies.js 참조.
 */
import { COMPANIES } from '@/lib/companies';

const KEY = 'v3:active-brand';
const DEFAULT_BRAND = 'main'; // 7번가피자 — 기존 DB(rnd_manager_v3)와 하위호환

const VALID_IDS = new Set(COMPANIES.map(c => c.id));

/** 현재 활성 브랜드 id (없거나 잘못된 값이면 'main') */
export function getActiveBrandId() {
  if (typeof localStorage === 'undefined') return DEFAULT_BRAND;
  try {
    const v = localStorage.getItem(KEY);
    return v && VALID_IDS.has(v) ? v : DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

/** 활성 브랜드 저장 (전환은 호출 측에서 reload로 반영) */
export function setActiveBrandId(id) {
  if (typeof localStorage === 'undefined') return;
  if (!VALID_IDS.has(id)) return;
  try { localStorage.setItem(KEY, id); } catch {}
}

/** 활성 브랜드 메타 객체 ({ id, name, logo, color, ... }) */
export function getActiveBrand() {
  const id = getActiveBrandId();
  return COMPANIES.find(c => c.id === id) || COMPANIES[0];
}

export { DEFAULT_BRAND };
