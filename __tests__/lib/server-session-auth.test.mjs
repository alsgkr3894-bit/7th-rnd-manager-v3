import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  assertAuthenticatedRequest,
  bootstrapVerifier,
  createLoginChallenge,
  issueSessionCookie,
  SessionAuthenticationError,
  verifyLoginChallenge,
} from '@/lib/server/session-auth';

let tempDir;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rnd-auth-'));
  process.env.RND_AUTH_STATE_PATH = join(tempDir, 'auth.json');
});

afterEach(() => {
  delete process.env.RND_AUTH_STATE_PATH;
  rmSync(tempDir, { recursive: true, force: true });
});

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
    const verifier = 'a'.repeat(64);
    bootstrapVerifier(verifier);
    const challenge = createLoginChallenge();
    const response = createHash('sha256')
      .update(`${verifier}:${challenge.nonce}`)
      .digest('hex');

    expect(verifyLoginChallenge({ challengeId: challenge.id, response })).toBe(true);
    expect(verifyLoginChallenge({ challengeId: challenge.id, response })).toBe(false);
  });

  test('서명된 HttpOnly 쿠키만 API 인증을 통과한다', () => {
    bootstrapVerifier('b'.repeat(64));
    const setCookie = issueSessionCookie();
    const request = new Request('http://localhost/api/db/health', {
      headers: { cookie: setCookie.split(';')[0] },
    });
    const forged = new Request('http://localhost/api/db/health', {
      headers: { cookie: 'v3:session=forged.value' },
    });

    expect(setCookie).toContain('HttpOnly');
    expect(() => assertAuthenticatedRequest(request)).not.toThrow();
    expect(() => assertAuthenticatedRequest(forged)).toThrow(SessionAuthenticationError);
  });
});
