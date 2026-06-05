/**
 * lib/auth.js — 로그인 인증 유틸 (서버 없는 로컬 환경)
 *
 * 비밀번호: Web Crypto API로 SHA-256 해시 → localStorage 저장
 * 세션: 쿠키 'v3:auth' (경량, SameSite=Strict)
 * 멀티 사용자 확장 예정 → 계정 구조를 배열로 설계
 */

const KEY_AUTH_HASH = 'v3:auth-hash';
const COOKIE_NAME   = 'v3:auth';

/** SHA-256 해시 (hex 문자열)
 *  crypto.subtle은 Secure Context(HTTPS 또는 localhost)에서만 사용 가능.
 *  LAN HTTP 환경(192.168.x.x:3000)에서는 사용 불가 → 명확한 에러 throw.
 */
export async function hashPassword(password) {
  if (!crypto?.subtle) {
    throw new Error('이 기능은 HTTPS 또는 localhost 환경에서만 사용할 수 있습니다. (crypto.subtle 미지원)');
  }
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 비밀번호가 저장된 해시와 일치하는지 확인 */
export async function verifyPassword(password) {
  const stored = localStorage.getItem(KEY_AUTH_HASH);
  if (!stored) return false;
  const input = await hashPassword(password);
  return input === stored;
}

/** 최초 비밀번호 설정 여부 */
export function isAuthSetup() {
  if (typeof localStorage === 'undefined') return false;
  return !!localStorage.getItem(KEY_AUTH_HASH);
}

/** 비밀번호 저장 (최초 설정 또는 변경) */
export async function savePassword(password) {
  const hash = await hashPassword(password);
  localStorage.setItem(KEY_AUTH_HASH, hash);
}

/**
 * 로그인 쿠키 발급.
 * @param {boolean} remember - true이면 30일, false이면 세션 쿠키
 */
export function setAuthCookie(remember = false) {
  const base = `${COOKIE_NAME}=1; path=/; SameSite=Strict`;
  document.cookie = remember
    ? `${base}; max-age=2592000`  // 30일
    : base;                       // 브라우저 닫으면 만료
}

/** 로그아웃 — 쿠키 삭제 */
export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
}

/** 현재 로그인 여부 (클라이언트 측 쿠키 체크) */
export function isLoggedIn() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(c => c.trim().startsWith(`${COOKIE_NAME}=`));
}
