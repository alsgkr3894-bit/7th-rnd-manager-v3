import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createHash } from 'node:crypto';
import { changeServerPassword, clearLegacyAuthStorage, establishServerSession } from '@/lib/auth';

const originalStorage = globalThis.localStorage;
const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
  globalThis.fetch = originalFetch;
});

const sha = text => createHash('sha256').update(text).digest('hex');

function serve(status) {
  const sent = [];
  globalThis.fetch = jest.fn(async (url, options = {}) => {
    if (!options.method) return new Response(JSON.stringify({ ok: true, ...status }));
    sent.push({ url, method: options.method, body: JSON.parse(options.body || 'null') });
    return new Response(JSON.stringify({ ok: true }));
  });
  return sent;
}

describe('브라우저의 로그인 요청', () => {
  test('로그인에는 비밀번호를 보내지 않고 일회용 응답만 보낸다', async () => {
    const sent = serve({ configured: true, id: 'c1', nonce: 'n1' });

    await establishServerSession('1234', { remember: true });

    expect(sent[0].body).toEqual({
      challengeId: 'c1',
      response: sha(`${sha('1234')}:n1`),
      remember: true,
    });
  });

  test('최초 설정과 변경은 서버가 길이를 검사할 수 있게 새 비밀번호를 보낸다', async () => {
    const setup = serve({ configured: false, id: 'c1', nonce: 'n1' });
    await establishServerSession('1234', { setupToken: 'token' });
    expect(setup[0].body).toEqual({ password: '1234', setupToken: 'token', remember: false });

    const change = serve({ configured: true, id: 'c2', nonce: 'n2' });
    await changeServerPassword({ currentPassword: '1234', newPassword: '5678' });
    expect(change[0].method).toBe('PUT');
    expect(change[0].body).toEqual({
      challengeId: 'c2',
      response: sha(`${sha('1234')}:n2`),
      password: '5678',
    });
  });

  test('이전 버전이 저장한 비밀번호 확인값을 지우고, 저장소가 막혀도 오류를 내지 않는다', () => {
    const removed = [];
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { removeItem: key => removed.push(key) },
    });
    clearLegacyAuthStorage();
    expect(removed).toEqual(['v3:auth-hash', 'v3:login-attempts']);

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        removeItem() {
          throw new Error('blocked');
        },
      },
    });
    expect(() => clearLegacyAuthStorage()).not.toThrow();
  });
});
