import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const proxy = readFileSync(new URL('../../proxy.ts', import.meta.url), 'utf8');

// proxy.ts는 TypeScript라 여기서 실행하지 않는다. 실제 동작은 실행 중인 서버에서 확인한다.
describe('화면 보호', () => {
  test('쿠키가 있는지가 아니라 서명 검증 결과로 판단한다', () => {
    expect(proxy).toContain('inspectSessionToken(token)');
    expect(proxy).not.toContain('cookies.has(');
    expect(proxy).toContain("session !== 'valid'");
  });

  test('위조·만료가 확실한 쿠키만 지운다', () => {
    expect(proxy).toContain("if (session === 'invalid') res.cookies.delete(COOKIE_NAME)");
  });
});
