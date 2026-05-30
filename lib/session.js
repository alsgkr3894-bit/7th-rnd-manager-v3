/**
 * lib/session.js — 세션 / 마지막 로그인 / IP 추적
 *
 * v3는 인증 시스템이 없으므로 "로그인"을 다음과 같이 간주:
 *   - sessionStorage가 비어있는 상태에서 앱이 처음 mount 되면 = 새 세션 시작
 *   - 새 세션 시작 시각을 localStorage('v3:last-login')에 기록
 *   - 다음 새 세션이 올 때까지 그 시각이 "마지막 로그인"
 *
 * IP는 브라우저에서 직접 알 수 없으므로 외부 공개 API(api.ipify.org) 사용.
 * 실패 시 null 반환 → UI에서 '외부 미연결' 표시.
 */

const KEY_LAST_LOGIN = 'v3:last-login';
const KEY_LAST_IP    = 'v3:last-ip';
const SESSION_FLAG   = 'v3:session-active';

/**
 * 새 세션인지 판정하고 마지막 로그인 시각을 갱신.
 * AppShell mount 시 1회 호출.
 *
 * @returns {{ isNewSession: boolean, lastLoginAt: string|null }}
 */
export function ensureSession() {
  if (typeof window === 'undefined') {
    return { isNewSession: false, lastLoginAt: null };
  }

  const isNewSession = !sessionStorage.getItem(SESSION_FLAG);

  // 이전 로그인 시각을 먼저 읽어두고, 이후에 현재 시각으로 덮어씀
  const previousLogin = getLastLogin();

  if (isNewSession) {
    const now = new Date().toISOString();
    sessionStorage.setItem(SESSION_FLAG, '1');
    try {
      localStorage.setItem(KEY_LAST_LOGIN, now);
    } catch (err) {
      console.warn('[session] localStorage 저장 실패:', err);
    }
  }

  return {
    isNewSession,
    lastLoginAt: previousLogin, // 현재 세션 시작 전의 마지막 로그인 시각
  };
}

/** 마지막 로그인 시각 (ISO 문자열 또는 null) */
export function getLastLogin() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(KEY_LAST_LOGIN);
}

/** 캐시된 마지막 IP (있으면 즉시 반환, 없으면 null) */
export function getCachedIP() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY_LAST_IP);
    if (!raw) return null;
    return JSON.parse(raw); // { ip, at }
  } catch {
    return null;
  }
}

/**
 * 공인 IP 조회 (외부 API: api.ipify.org).
 * 3초 timeout, 실패 시 null.
 *
 * @returns {Promise<{ip: string, at: string} | null>}
 */
export async function fetchClientIP() {
  if (typeof window === 'undefined') return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`ipify HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.ip) throw new Error('ipify: ip 없음');

    const entry = { ip: data.ip, at: new Date().toISOString() };
    try {
      localStorage.setItem(KEY_LAST_IP, JSON.stringify(entry));
    } catch (err) {
      console.warn('[session] localStorage 저장 실패:', err);
    }
    return entry;
  } catch (err) {
    console.warn('[session] IP 조회 실패:', err.message);
    return null;
  }
}
