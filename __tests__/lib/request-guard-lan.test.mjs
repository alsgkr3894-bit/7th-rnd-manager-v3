/**
 * LAN 접속 허용 가드 테스트.
 * 기본은 루프백 전용, RND_ALLOW_LAN=1 일 때만 RFC1918 사설 대역을 연다.
 * 경계 바로 밖(172.32.x 등)과 교차 출처(Origin≠Host)는 어떤 설정에서도 막혀야 한다.
 */
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import {
  RequestNotLocalError,
  assertLocalRequest,
  isPrivateLanHostname,
} from '../../lib/server/request-guard.js';

function req(headers) {
  return { headers: { get: name => headers[name] ?? null } };
}

const originalEnv = { ...process.env };
beforeEach(() => {
  delete process.env.RND_ALLOW_LAN;
  delete process.env.RND_ALLOWED_LAN_HOSTS;
});
afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isPrivateLanHostname — RFC1918 경계', () => {
  test.each(['10.0.0.1', '10.255.255.254', '172.16.0.1', '172.31.255.9', '192.168.0.9'])(
    '%s 는 사설 대역이다',
    value => expect(isPrivateLanHostname(value)).toBe(true)
  );

  // 경계 바로 밖 — 여기서 새면 공인 IP가 통과한다
  test.each(['172.15.0.1', '172.32.0.1', '11.0.0.1', '192.169.0.1', '8.8.8.8'])(
    '%s 는 사설 대역이 아니다',
    value => expect(isPrivateLanHostname(value)).toBe(false)
  );

  test.each(['999.1.1.1', '10.0.0', '10.0.0.1.5', 'example.com', 'evil.10.0.0.1.com', ''])(
    '%s 는 IPv4 리터럴이 아니므로 false',
    value => expect(isPrivateLanHostname(value)).toBe(false)
  );

  test('스킴과 포트가 붙어 있어도 판정한다', () => {
    expect(isPrivateLanHostname('http://192.168.1.50:3000')).toBe(true);
  });
});

describe('assertLocalRequest — 기본(루프백 전용)', () => {
  test.each(['http://localhost:3000', 'http://127.0.0.1:3000'])('%s 는 통과', origin => {
    expect(() => assertLocalRequest(req({ origin, host: origin.replace(/^https?:\/\//, '') })))
      .not.toThrow();
  });

  test('플래그가 없으면 사설 대역도 거부한다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://192.168.1.50:3000', host: '192.168.1.50:3000' }))
    ).toThrow(RequestNotLocalError);
  });

  test('헤더 객체가 없으면 거부한다', () => {
    expect(() => assertLocalRequest(null)).toThrow(RequestNotLocalError);
    expect(() => assertLocalRequest({})).toThrow(RequestNotLocalError);
  });

  test('Origin이 없으면 Host로 판정한다', () => {
    expect(() => assertLocalRequest(req({ host: 'localhost:3000' }))).not.toThrow();
    expect(() => assertLocalRequest(req({ host: '192.168.1.50:3000' }))).toThrow(
      RequestNotLocalError
    );
  });
});

describe('assertLocalRequest — RND_ALLOW_LAN=1', () => {
  beforeEach(() => {
    process.env.RND_ALLOW_LAN = '1';
  });

  test('사설 대역 LAN 클라이언트가 통과한다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://192.168.1.50:3000', host: '192.168.1.50:3000' }))
    ).not.toThrow();
  });

  test('루프백은 여전히 통과한다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://localhost:3000', host: 'localhost:3000' }))
    ).not.toThrow();
  });

  test('공인 IP·외부 도메인은 여전히 거부한다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://8.8.8.8', host: '8.8.8.8' }))
    ).toThrow(RequestNotLocalError);
    expect(() =>
      assertLocalRequest(req({ origin: 'https://evil.example.com', host: 'evil.example.com' }))
    ).toThrow(RequestNotLocalError);
  });

  test('경계 바로 밖 172.32.x 는 거부한다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://172.32.0.1:3000', host: '172.32.0.1:3000' }))
    ).toThrow(RequestNotLocalError);
  });

  // 사설 대역을 연 뒤에도 CSRF 방어가 남아 있어야 하는 핵심 케이스
  test('Origin과 Host의 호스트명이 다르면 거부한다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://192.168.1.99:3000', host: '192.168.1.50:3000' }))
    ).toThrow(RequestNotLocalError);
    expect(() =>
      assertLocalRequest(req({ origin: 'http://localhost:3000', host: '192.168.1.50:3000' }))
    ).toThrow(RequestNotLocalError);
  });

  test('포트만 다른 것은 같은 호스트로 본다', () => {
    expect(() =>
      assertLocalRequest(req({ origin: 'http://192.168.1.50:3000', host: '192.168.1.50' }))
    ).not.toThrow();
  });

  test('RND_ALLOWED_LAN_HOSTS 에 등록한 호스트명만 추가로 허용한다', () => {
    process.env.RND_ALLOWED_LAN_HOSTS = 'rnd-pc, rnd-pc.local';
    expect(() =>
      assertLocalRequest(req({ origin: 'http://rnd-pc:3000', host: 'rnd-pc:3000' }))
    ).not.toThrow();
    expect(() =>
      assertLocalRequest(req({ origin: 'http://other-pc:3000', host: 'other-pc:3000' }))
    ).toThrow(RequestNotLocalError);
  });

  test('호스트명 허용목록은 플래그가 꺼지면 무효다', () => {
    process.env.RND_ALLOWED_LAN_HOSTS = 'rnd-pc';
    process.env.RND_ALLOW_LAN = '0';
    expect(() =>
      assertLocalRequest(req({ origin: 'http://rnd-pc:3000', host: 'rnd-pc:3000' }))
    ).toThrow(RequestNotLocalError);
  });
});
