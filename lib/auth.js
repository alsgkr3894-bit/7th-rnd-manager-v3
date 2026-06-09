/**
 * lib/auth.js — 로그인 인증 유틸 (서버 없는 로컬 환경)
 *
 * 비밀번호: SHA-256 해시 → localStorage 저장
 * 세션: 쿠키 'v3:auth' (경량, SameSite=Strict)
 * 멀티 사용자 확장 예정 → 계정 구조를 배열로 설계
 */

const KEY_AUTH_HASH = 'v3:auth-hash';
const COOKIE_NAME = 'v3:auth';

// crypto.subtle 미지원 환경(LAN HTTP)용 순수 JS SHA-256 — crypto.subtle과 동일 출력 보장
function sha256js(str) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const msg = new TextEncoder().encode(str);
  const l = msg.length * 8;
  const size = Math.ceil((msg.length + 9) / 64) * 64;
  const buf = new Uint8Array(size);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(size - 8, Math.floor(l / 0x100000000) >>> 0, false);
  dv.setUint32(size - 4, l >>> 0, false);
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a;
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;
  const rotr = (n, x) => ((x >>> n) | (x << (32 - n))) >>> 0;
  for (let i = 0; i < size; i += 64) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(7, w[j - 15]) ^ rotr(18, w[j - 15]) ^ (w[j - 15] >>> 3);
      const s1 = rotr(17, w[j - 2]) ^ rotr(19, w[j - 2]) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(v => v.toString(16).padStart(8, '0')).join('');
}

/** SHA-256 해시 (hex 문자열) — HTTPS/localhost는 crypto.subtle, LAN HTTP는 순수 JS 폴백 */
export async function hashPassword(password) {
  if (globalThis.crypto?.subtle?.digest) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return sha256js(password);
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
    ? `${base}; max-age=2592000` // 30일
    : base; // 브라우저 닫으면 만료
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
