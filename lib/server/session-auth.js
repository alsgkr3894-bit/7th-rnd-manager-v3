import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SERVER_SESSION_COOKIE = 'v3:session';
const SESSION_SECONDS = 12 * 60 * 60;
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const CHALLENGE_MS = 2 * 60 * 1000;
const challenges = new Map();

function statePath() {
  return resolve(process.cwd(), process.env.RND_AUTH_STATE_PATH || '.runtime-auth.json');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function writeState(state) {
  const path = statePath();
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temp, path);
}

function state() {
  const path = statePath();
  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed?.secret) return parsed;
  }
  const created = { secret: randomBytes(32).toString('hex'), verifier: null };
  writeState(created);
  return created;
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

export function createLoginChallenge() {
  const id = randomBytes(18).toString('base64url');
  const nonce = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_MS;
  challenges.set(id, { nonce, expiresAt });
  for (const [key, value] of challenges) if (value.expiresAt <= Date.now()) challenges.delete(key);
  return { id, nonce, expiresAt, configured: Boolean(state().verifier) };
}

export function isSessionConfigured() {
  return Boolean(state().verifier);
}

export function verifyLoginChallenge({ challengeId, response }) {
  const challenge = challenges.get(String(challengeId || ''));
  challenges.delete(String(challengeId || ''));
  if (!challenge || challenge.expiresAt <= Date.now()) return false;
  const verifier = state().verifier;
  if (!verifier) return false;
  const expected = createHash('sha256').update(`${verifier}:${challenge.nonce}`).digest('hex');
  return safeEqual(expected, response);
}

export function bootstrapVerifier(verifier) {
  if (!/^[a-f0-9]{64}$/i.test(String(verifier || ''))) throw new SessionAuthenticationError();
  const current = state();
  if (current.verifier) throw new SessionAuthenticationError('서버 인증이 이미 설정되어 있습니다.');
  writeState({ ...current, verifier: String(verifier).toLowerCase() });
}

export function replaceVerifier(request, verifier) {
  assertAuthenticatedRequest(request);
  if (!/^[a-f0-9]{64}$/i.test(String(verifier || ''))) throw new SessionAuthenticationError();
  writeState({ ...state(), verifier: String(verifier).toLowerCase() });
}

export function issueSessionCookie({ remember = false, secure = false } = {}) {
  const maxAge = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + maxAge * 1000 })).toString('base64url');
  const token = `${payload}.${signature(payload, state().secret)}`;
  return `${SERVER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie() {
  return `${SERVER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function assertAuthenticatedRequest(request) {
  const token = cookieValue(request, SERVER_SESSION_COOKIE);
  const [payload, received] = token.split('.');
  if (!payload || !received || !safeEqual(signature(payload, state().secret), received)) {
    throw new SessionAuthenticationError();
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isFinite(parsed.exp) || parsed.exp <= Date.now()) throw new Error('expired');
  } catch {
    throw new SessionAuthenticationError();
  }
}
