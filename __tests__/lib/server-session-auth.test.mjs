import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  assertAuthenticatedRequest,
  AuthStateError,
  bootstrapPassword,
  changePassword,
  createLoginChallenge,
  inspectSessionToken,
  issueSessionCookie,
  LoginFailedError,
  LoginLockedError,
  MAX_CHALLENGES,
  PasswordPolicyError,
  revokeAllSessions,
  SessionAuthenticationError,
  setupTokenPath,
  verifyLoginChallenge,
} from '@/lib/server/session-auth';

let tempDir;
let statePath;
let warn;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rnd-auth-'));
  statePath = join(tempDir, 'auth.json');
  process.env.RND_AUTH_STATE_PATH = statePath;
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  warn.mockRestore();
  delete process.env.RND_AUTH_STATE_PATH;
  rmSync(tempDir, { recursive: true, force: true });
});

const sha = text => createHash('sha256').update(text).digest('hex');
const state = () => JSON.parse(readFileSync(statePath, 'utf8'));
const answer = password => {
  const challenge = createLoginChallenge();
  return {
    challengeId: challenge.id,
    response: sha(`${sha(password)}:${challenge.nonce}`),
  };
};
const setup = (password = '1234') => {
  createLoginChallenge();
  const setupToken = readFileSync(setupTokenPath(), 'utf8').trim();
  bootstrapPassword({ password, setupToken });
};
const requestWith = setCookie =>
  new Request('http://localhost/api/db/health', {
    headers: { cookie: setCookie.split(';')[0] },
  });
const tokenOf = setCookie => setCookie.split(';')[0].slice('v3:session='.length);

describe('서버 서명 세션', () => {
  test('모든 DB API 라우트가 서명 세션을 검증한다', () => {
    for (const file of [
      'app/api/db/health/route.js',
      'app/api/db/backups/route.js',
      'app/api/db/store-rows/route.js',
    ]) {
      expect(readFileSync(file, 'utf8')).toContain('assertAuthenticatedRequest(request)');
    }
  });

  test('일회용 challenge 응답을 검증하고 재사용은 거부한다', () => {
    setup();
    const proof = answer('1234');

    expect(verifyLoginChallenge(proof)).toBe(true);
    expect(() => verifyLoginChallenge(proof)).toThrow(SessionAuthenticationError);
  });

  test('서명된 HttpOnly 쿠키만 API 인증을 통과한다', () => {
    setup();
    const setCookie = issueSessionCookie();
    const forged = new Request('http://localhost/api/db/health', {
      headers: { cookie: 'v3:session=forged.value' },
    });

    expect(setCookie).toContain('HttpOnly');
    expect(() => assertAuthenticatedRequest(requestWith(setCookie))).not.toThrow();
    expect(() => assertAuthenticatedRequest(forged)).toThrow(SessionAuthenticationError);
  });
});

describe('최초 설정', () => {
  test('설치 토큰이 있어야 하고, 설정이 끝나면 토큰 파일을 지운다', () => {
    createLoginChallenge();

    expect(() => bootstrapPassword({ password: '1234', setupToken: 'wrong' })).toThrow(
      LoginFailedError
    );
    expect(() => bootstrapPassword({ password: '1234' })).toThrow(LoginFailedError);
    expect(state().verifier).toBeNull();

    setup();
    expect(state().verifier).toBe(sha('1234'));
    expect(existsSync(setupTokenPath())).toBe(false);
  });

  test('서버가 비밀번호 길이를 검사하고, 한 번 설정하면 다시 설정할 수 없다', () => {
    createLoginChallenge();
    const setupToken = readFileSync(setupTokenPath(), 'utf8').trim();

    expect(() => bootstrapPassword({ password: '123', setupToken })).toThrow(PasswordPolicyError);
    expect(() => bootstrapPassword({ password: 'a'.repeat(129), setupToken })).toThrow(
      PasswordPolicyError
    );
    // 예전 방식(확인값만 보내기)은 받지 않는다
    expect(() => bootstrapPassword({ verifier: 'a'.repeat(64), setupToken })).toThrow(
      PasswordPolicyError
    );

    bootstrapPassword({ password: '1234', setupToken });
    expect(() => bootstrapPassword({ password: '9999', setupToken })).toThrow(
      '이미 설정되어 있습니다'
    );
  });
});

describe('로그인 실패 제한', () => {
  test('5회 연속 실패하면 15분 동안 맞는 비밀번호도 거부한다', () => {
    jest.useFakeTimers({ now: 1_800_000_000_000 });
    setup();
    for (let i = 1; i <= 4; i += 1) {
      expect(() => verifyLoginChallenge(answer('bad'))).toThrow(`${5 - i}회 남음`);
    }
    expect(() => verifyLoginChallenge(answer('bad'))).toThrow(LoginLockedError);
    expect(() => verifyLoginChallenge(answer('1234'))).toThrow(LoginLockedError);
    // 서버를 다시 시작해도 남도록 파일에 적는다
    expect(state().loginGuard.lockedUntil).toBe(Date.now() + 15 * 60 * 1000);

    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(verifyLoginChallenge(answer('1234'))).toBe(true);
    expect(state().loginGuard).toBeUndefined();
  });

  test('성공하면 실패 횟수를 지우고, 만료된 요청은 실패로 세지 않는다', () => {
    setup();
    expect(() => verifyLoginChallenge(answer('bad'))).toThrow('4회 남음');
    expect(() => verifyLoginChallenge({ challengeId: 'none', response: 'x' })).toThrow('만료');
    expect(state().loginGuard.failures).toBe(1);

    verifyLoginChallenge(answer('1234'));
    expect(() => verifyLoginChallenge(answer('bad'))).toThrow('4회 남음');
  });

  test('오래된 실패는 이어서 세지 않는다', () => {
    jest.useFakeTimers({ now: 1_800_000_000_000 });
    setup();
    expect(() => verifyLoginChallenge(answer('bad'))).toThrow('4회 남음');
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(() => verifyLoginChallenge(answer('bad'))).toThrow('4회 남음');
  });

  test('challenge는 정해진 개수만 보관하고 오래된 것부터 버린다', () => {
    setup();
    const first = answer('1234');
    for (let i = 0; i < MAX_CHALLENGES; i += 1) createLoginChallenge();

    expect(() => verifyLoginChallenge(first)).toThrow('만료');
    expect(verifyLoginChallenge(answer('1234'))).toBe(true);
  });
});

describe('세션 무효화', () => {
  test('비밀번호를 바꾸면 이전 세션이 모두 무효가 된다', () => {
    setup();
    const old = issueSessionCookie({ remember: true });

    const result = changePassword(requestWith(old), { ...answer('1234'), password: '5678' });

    expect(result).toEqual({ remember: true });
    expect(() => assertAuthenticatedRequest(requestWith(old))).toThrow(SessionAuthenticationError);
    expect(inspectSessionToken(tokenOf(old))).toBe('invalid');
    expect(inspectSessionToken(tokenOf(issueSessionCookie()))).toBe('valid');
    expect(verifyLoginChallenge(answer('5678'))).toBe(true);
  });

  test('현재 비밀번호가 틀리면 바꾸지 않는다', () => {
    setup();
    const cookie = issueSessionCookie();

    expect(() =>
      changePassword(requestWith(cookie), { ...answer('bad'), password: '5678' })
    ).toThrow(LoginFailedError);
    expect(state().verifier).toBe(sha('1234'));
    expect(inspectSessionToken(tokenOf(cookie))).toBe('valid');
  });

  test('모든 로그인 해제는 로그인한 요청만 할 수 있다', () => {
    setup();
    const cookie = issueSessionCookie();
    expect(() => revokeAllSessions(new Request('http://localhost/x'))).toThrow(
      SessionAuthenticationError
    );
    expect(inspectSessionToken(tokenOf(cookie))).toBe('valid');

    revokeAllSessions(requestWith(cookie));
    expect(inspectSessionToken(tokenOf(cookie))).toBe('invalid');
  });

  test('버전이 없는 예전 설정과 예전 토큰은 계속 로그인 상태다', async () => {
    const { createHmac } = await import('node:crypto');
    const secret = 'c'.repeat(64);
    writeFileSync(statePath, JSON.stringify({ secret, verifier: sha('1234') }));
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 60_000 })).toString('base64url');
    const token = `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;

    expect(inspectSessionToken(token)).toBe('valid');
  });

  test('만료된 토큰은 거부한다', () => {
    jest.useFakeTimers({ now: 1_800_000_000_000 });
    setup();
    const token = tokenOf(issueSessionCookie());
    jest.advanceTimersByTime(12 * 60 * 60 * 1000);

    expect(inspectSessionToken(token)).toBe('invalid');
  });
});

describe('인증 상태 파일', () => {
  test('손상되면 새 키로 덮어쓰지 않고 복구 방법을 알린다', () => {
    setup();
    const cookie = issueSessionCookie();
    writeFileSync(statePath, '{"secret": ');

    expect(() => createLoginChallenge()).toThrow(AuthStateError);
    expect(() => createLoginChallenge()).toThrow('auth.json.bak');
    expect(readFileSync(statePath, 'utf8')).toBe('{"secret": ');
    // 일시적인 문제일 수 있어 쿠키는 지우지 않는다
    expect(inspectSessionToken(tokenOf(cookie))).toBe('unavailable');

    writeFileSync(statePath, readFileSync(`${statePath}.bak`));
    expect(inspectSessionToken(tokenOf(cookie))).toBe('valid');
  });

  test('값이 빠진 파일도 손상으로 본다', () => {
    writeFileSync(statePath, JSON.stringify({ verifier: null }));
    expect(() => createLoginChallenge()).toThrow(AuthStateError);
  });

  test('파일만 없어지고 사본이 남아 있으면 새로 설정하게 두지 않는다', () => {
    setup();
    rmSync(statePath);

    expect(() => createLoginChallenge()).toThrow('사본만');
    expect(existsSync(statePath)).toBe(false);
  });
});
