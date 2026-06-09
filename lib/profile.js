/**
 * lib/profile.js — 사용자 프로필 (단일 사용자)
 *
 * 현재 v3는 단일 사용자 / 로컬 환경. 인증 시스템 없음.
 * 프로필 정보는 localStorage에 저장하며 TopBar 등 표시용으로 사용.
 *
 * 멀티 사용자 시스템 도입 시 이 파일을 대체.
 */

import { KEYS } from '@/lib/note/keys';
import { asDisplayText } from '@/lib/ui/prop-guards';
const KEY = KEYS.PROFILE;

const DEFAULT_PROFILE = {
  name: '이민학 주임',
  email: 'rnd@7thpizza.com',
  team: 'R&D팀',
  role: '관리자',
};

const PROFILE_FIELDS = Object.keys(DEFAULT_PROFILE);

function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_PROFILE };
  }
  const next = { ...DEFAULT_PROFILE };
  for (const field of PROFILE_FIELDS) {
    if (typeof value[field] === 'string') next[field] = value[field];
  }
  return next;
}

/** 프로필 읽기 (localStorage → 기본값) */
export function getProfile() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return normalizeProfile(parsed);
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

/** 프로필 저장 (전체 또는 부분 업데이트) */
export function setProfile(patch) {
  const current = getProfile();
  const next = normalizeProfile({ ...current, ...patch });
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[profile] localStorage 저장 실패:', err);
  }
  return next;
}

/** 이니셜 1자 추출 (이름 첫 글자) */
export function getInitial(name) {
  const trimmed = asDisplayText(name).trim();
  return trimmed ? trimmed.charAt(0) : '?';
}
