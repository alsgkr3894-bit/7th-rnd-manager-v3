/**
 * lib/server/login-guard.js — 서버 로그인 실패 제한
 *
 * 사용자가 한 명이라 접속 주소로 나누지 않고 전체를 한 묶음으로 센다(헤더의 주소는
 * 요청자가 바꿀 수 있다). 5회 연속 실패하면 15분 동안 맞는 비밀번호도 받지 않는다.
 * 값은 인증 상태 파일에 남겨 서버를 다시 시작해도 풀리지 않는다.
 */
import { readAuthState, writeAuthState } from './auth-state';

export const MAX_LOGIN_FAILURES = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export class LoginLockedError extends Error {
  constructor(remainingMs) {
    const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
    super(`로그인 시도가 너무 많습니다. 약 ${minutes}분 후 다시 시도해 주세요.`);
    this.name = 'LoginLockedError';
    this.retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  }
}

export class LoginFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoginFailedError';
  }
}

function currentGuard(state, now) {
  const failures = Number(state.loginGuard?.failures) || 0;
  const lockedUntil = Number(state.loginGuard?.lockedUntil) || 0;
  const lastFailureAt = Number(state.loginGuard?.lastFailureAt) || 0;
  if (lockedUntil > now) return { failures, lockedUntil, lastFailureAt };
  // 잠금이 끝났거나 마지막 실패가 오래됐으면 처음부터 센다
  if (lockedUntil || now - lastFailureAt >= LOGIN_LOCK_MS) {
    return { failures: 0, lockedUntil: 0, lastFailureAt: 0 };
  }
  return { failures, lockedUntil, lastFailureAt };
}

export function assertLoginAllowed(now = Date.now()) {
  const { lockedUntil } = currentGuard(readAuthState(), now);
  if (lockedUntil > now) throw new LoginLockedError(lockedUntil - now);
}

/** 실패를 기록하고 던진다 — 마지막 기회였으면 잠금 오류를, 아니면 남은 횟수를 알린다. */
export function rejectLogin(reason = '비밀번호가 올바르지 않습니다.', now = Date.now()) {
  const state = readAuthState();
  const failures = currentGuard(state, now).failures + 1;
  const lockedUntil = failures >= MAX_LOGIN_FAILURES ? now + LOGIN_LOCK_MS : 0;
  writeAuthState({ ...state, loginGuard: { failures, lockedUntil, lastFailureAt: now } });
  if (lockedUntil) throw new LoginLockedError(LOGIN_LOCK_MS);
  throw new LoginFailedError(`${reason} (${MAX_LOGIN_FAILURES - failures}회 남음)`);
}

export function clearLoginFailures() {
  const state = readAuthState();
  if (!state.loginGuard) return;
  const { loginGuard, ...rest } = state;
  writeAuthState(rest);
}
