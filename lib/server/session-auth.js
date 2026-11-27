/**
 * lib/server/session-auth.js — 서버 로그인(challenge)과 서명 세션
 *
 * 세션 토큰은 `payload.서명`이며 payload에 만료 시각(exp)과 세션 버전(v)이 있다.
 * 비밀번호를 바꾸거나 [모든 로그인 해제]를 하면 버전이 올라가 이전 토큰이 전부 무효가 된다.
 * 버전이 없는 예전 토큰은 버전 0으로 본다.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { passwordProblem } from '@/lib/auth/password-policy';
import { authStatePath, readAuthState, writeAuthState } from './auth-state';
import { assertLoginAllowed, clearLoginFailures, rejectLogin } from './login-guard';

export { AuthStateError } from './auth-state';
export { LoginFailedError, LoginLockedError } from './login-guard';

export const SERVER_SESSION_COOKIE = 'v3:session';
const SESSION_SECONDS = 12 * 60 * 60;
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const CHALLENGE_MS = 2 * 60 * 1000;
// 로그인 전에도 누구나 받을 수 있는 값이라 개수를 제한한다(오래된 것부터 버린다)
export const MAX_CHALLENGES = 50;
const challenges = new Map();

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

function signature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export class SessionAuthenticationError extends Error {
  constructor(message = '로그인이 필요합니다.') {
    super(message);
    this.name = 'SessionAuthenticationError';
  }
}

export class PasswordPolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

function checkedVerifier(password) {
  const problem = passwordProblem(password);
  if (problem) throw new PasswordPolicyError(problem);
  return sha256(password);
}

export function setupTokenPath() {
  return `${authStatePath()}.setup-token`;
}

function readSetupToken() {
  try {
    return readFileSync(setupTokenPath(), 'utf8').trim();
  } catch {
    return '';
  }
}

/** 비밀번호가 아직 없을 때만, 최초 설정에 필요한 일회용 값을 파일로 만든다. */
function ensureSetupToken() {
  if (readSetupToken()) return;
  writeFileSync(setupTokenPath(), `${randomBytes(12).toString('hex')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  console.warn(`[auth] 최초 설정 토큰 파일을 만들었습니다: ${setupTokenPath()}`);
}

export function createLoginChallenge() {
  const configured = isSessionConfigured();
  if (!configured) ensureSetupToken();
  const id = randomBytes(18).toString('base64url');
  const nonce = randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + CHALLENGE_MS;
  for (const [key, value] of challenges) if (value.expiresAt <= now) challenges.delete(key);
  while (challenges.size >= MAX_CHALLENGES) challenges.delete(challenges.keys().next().value);
  challenges.set(id, { nonce, expiresAt });
  return { id, nonce, expiresAt, configured };
}

export function isSessionConfigured() {
  return Boolean(readAuthState().verifier);
}

/** 맞으면 true. 틀리면 실패를 세고 던진다. */
export function verifyLoginChallenge({ challengeId, response }) {
  assertLoginAllowed();
  const key = String(challengeId || '');
  const challenge = challenges.get(key);
  challenges.delete(key);
  // 만료·재사용된 challenge로는 비밀번호를 시험할 수 없으므로 실패로 세지 않는다
  if (!challenge || challenge.expiresAt <= Date.now()) {
    throw new SessionAuthenticationError('로그인 요청이 만료되었습니다. 다시 시도해 주세요.');
  }
  const verifier = readAuthState().verifier;
  if (!verifier) throw new SessionAuthenticationError();
  if (!safeEqual(sha256(`${verifier}:${challenge.nonce}`), response)) rejectLogin();
  clearLoginFailures();
  return true;
}

/** 최초 비밀번호 설정 — 설치 토큰이 맞아야 하고 한 번만 된다. */
export function bootstrapPassword({ password, setupToken }) {
  if (readAuthState().verifier) {
    throw new SessionAuthenticationError('서버 인증이 이미 설정되어 있습니다.');
  }
  assertLoginAllowed();
  const expected = readSetupToken();
  if (!expected || !safeEqual(expected, String(setupToken || '').trim())) {
    rejectLogin('설치 토큰이 올바르지 않습니다.');
  }
  const verifier = checkedVerifier(password);
  clearLoginFailures();
  writeAuthState({ ...readAuthState(), verifier });
  rmSync(setupTokenPath(), { force: true });
}

function bumpSessionVersion(changes = {}) {
  const state = readAuthState();
  writeAuthState({ ...state, ...changes, sessionVersion: (state.sessionVersion || 0) + 1 });
}

/** 비밀번호 변경 — 현재 비밀번호를 다시 확인하고, 이전에 발급한 세션을 모두 무효화한다. */
export function changePassword(request, { challengeId, response, password }) {
  const session = assertAuthenticatedRequest(request);
  const verifier = checkedVerifier(password);
  verifyLoginChallenge({ challengeId, response });
  bumpSessionVersion({ verifier });
  return session;
}

export function revokeAllSessions(request) {
  assertAuthenticatedRequest(request);
  bumpSessionVersion();
}

export function issueSessionCookie({ remember = false, secure = false } = {}) {
  const state = readAuthState();
  const maxAge = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const claims = {
    exp: Date.now() + maxAge * 1000,
    v: state.sessionVersion || 0,
    r: remember ? 1 : 0,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const token = `${payload}.${signature(payload, state.secret)}`;
  return `${SERVER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie({ secure = false } = {}) {
  return `${SERVER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

function sessionClaims(token, state) {
  const [payload, received] = String(token || '').split('.');
  if (!payload || !received || !safeEqual(signature(payload, state.secret), received)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isFinite(claims.exp) || claims.exp <= Date.now()) return null;
    if ((claims.v || 0) !== (state.sessionVersion || 0)) return null;
    return claims;
  } catch {
    return null;
  }
}

/**
 * 화면 보호(proxy)용 판정.
 * - 'valid' 통과, 'invalid' 위조·만료·폐기된 토큰(쿠키를 지워도 된다)
 * - 'unavailable' 설정 파일을 지금 못 읽음(통과시키지 않되 쿠키는 남긴다)
 */
export function inspectSessionToken(token) {
  let state;
  try {
    state = readAuthState();
  } catch {
    return 'unavailable';
  }
  return sessionClaims(token, state) ? 'valid' : 'invalid';
}

export function assertAuthenticatedRequest(request) {
  const claims = sessionClaims(cookieValue(request, SERVER_SESSION_COOKIE), readAuthState());
  if (!claims) throw new SessionAuthenticationError();
  return { remember: claims.r === 1 };
}
