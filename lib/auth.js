/**
 * lib/auth.js — 화면 쪽 로그인 요청
 *
 * 비밀번호의 판정·실패 제한·세션 발급은 모두 서버가 한다(lib/server/session-auth.js).
 * 브라우저에는 비밀번호도, 비밀번호에서 만든 값도 저장하지 않는다.
 * 세션: 서버가 발급·검증하는 HttpOnly 서명 쿠키 'v3:session'
 */

import { fetchAppJson } from '@/lib/session';

// 이전 버전이 localStorage에 남긴 값 — 비밀번호 확인값은 로그인에 그대로 쓸 수 있어 지운다
const LEGACY_AUTH_KEYS = ['v3:auth-hash', 'v3:login-attempts'];
const COOKIE_NAME = 'v3:auth';

export function clearLegacyAuthStorage() {
  if (typeof localStorage === 'undefined') return;
  for (const key of LEGACY_AUTH_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // 저장소가 차단된 환경에는 남은 값도 없다
    }
  }
}

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

const SESSION_PATH = '/api/auth/session';

function sendAuth(method, body, path = SESSION_PATH) {
  return fetchAppJson(path, {
    method,
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
}

export function getServerAuthStatus() {
  return fetchAppJson(SESSION_PATH);
}

/** 비밀번호를 그대로 보내지 않고 서버가 준 일회용 값으로 만든 응답을 보낸다 */
async function challengeResponse(challenge, password) {
  const verifier = await hashPassword(password);
  return {
    challengeId: challenge.id,
    response: await hashPassword(`${verifier}:${challenge.nonce}`),
  };
}

/** 로그인. 비밀번호가 아직 없으면 설치 토큰과 함께 최초 설정을 한다. */
export async function establishServerSession(password, { remember = false, setupToken = '' } = {}) {
  const challenge = await getServerAuthStatus();
  const proof = challenge.configured
    ? await challengeResponse(challenge, password)
    : { password, setupToken };
  return sendAuth('POST', { ...proof, remember });
}

/** 비밀번호 변경 — 서버가 현재 비밀번호를 확인하고 다른 로그인을 모두 해제한다 */
export async function changeServerPassword({ currentPassword, newPassword }) {
  const challenge = await getServerAuthStatus();
  const proof = await challengeResponse(challenge, currentPassword);
  return sendAuth('PUT', { ...proof, password: newPassword });
}

/** 이 브라우저를 포함해 발급된 모든 로그인을 해제한다 */
export function logoutAllSessions() {
  return sendAuth('DELETE', null, `${SESSION_PATH}?all=1`);
}

/** 로그아웃 — 구형 쿠키와 서버 세션을 함께 삭제 */
export async function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
  try {
    await sendAuth('DELETE');
  } catch {
    return false;
  }
  return true;
}
