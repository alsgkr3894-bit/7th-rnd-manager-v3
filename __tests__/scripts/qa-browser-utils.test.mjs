import { jest } from '@jest/globals';

import {
  assertQaBaseReachable,
  assertQaBaseReachableWithBrowser,
  checkQaBaseReachable,
  checkQaBaseReachableWithBrowser,
} from '../../scripts/qa-browser-utils.mjs';

function makeMockBrowser(gotoImpl) {
  let currentUrl = 'about:blank';
  const page = {
    goto: jest.fn(async url => {
      currentUrl = url;
      return gotoImpl(url);
    }),
    url: jest.fn(() => currentUrl),
  };
  const ctx = {
    newPage: jest.fn(async () => page),
    close: jest.fn(async () => {}),
  };
  const browser = {
    newContext: jest.fn(async () => ctx),
  };

  return { browser, ctx, page };
}

describe('qa-browser-utils health check', () => {
  test('base URL이 응답하면 reachable로 판단한다', async () => {
    const fetchImpl = jest.fn(async () => ({ status: 200 }));

    const result = await checkQaBaseReachable('http://localhost:3000///', {
      fetchImpl,
      timeoutMs: 1000,
    });

    expect(result).toEqual({ ok: true, status: 200, url: 'http://localhost:3000/' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  test('localhost health check 실패 시 IPv4 loopback으로 재시도한다', async () => {
    const fetchImpl = jest.fn(async url => {
      if (url === 'http://localhost:3000/') throw new Error('fetch failed');
      return { status: 200 };
    });

    const result = await checkQaBaseReachable('http://localhost:3000', {
      fetchImpl,
      timeoutMs: 1000,
    });

    expect(result).toEqual({ ok: true, status: 200, url: 'http://127.0.0.1:3000/' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('네트워크 연결 실패는 서버 미기동 실패로 분리한다', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    });

    await expect(
      assertQaBaseReachable('http://localhost:3999', { fetchImpl, timeoutMs: 1000 })
    ).rejects.toThrow(/QA 서버에 연결할 수 없습니다.*ECONNREFUSED/);
  });

  test('HTTP 500 응답은 라우트 검사 전 health check에서 실패한다', async () => {
    const fetchImpl = jest.fn(async () => ({ status: 500 }));

    await expect(
      assertQaBaseReachable('http://localhost:3000', { fetchImpl, timeoutMs: 1000 })
    ).rejects.toThrow(/HTTP 500/);
  });

  test('browser health check는 Playwright page로 base URL을 확인한다', async () => {
    const { browser, ctx, page } = makeMockBrowser(async () => ({ status: () => 200 }));

    const result = await checkQaBaseReachableWithBrowser(browser, 'http://localhost:3000', {
      timeoutMs: 1000,
    });

    expect(result).toEqual({ ok: true, status: 200, url: 'http://localhost:3000/' });
    expect(page.goto).toHaveBeenCalledWith(
      'http://localhost:3000/',
      expect.objectContaining({ waitUntil: 'domcontentloaded', timeout: 1000 })
    );
    expect(ctx.close).toHaveBeenCalled();
  });

  test('browser health check도 localhost 실패 시 IPv4 loopback으로 재시도한다', async () => {
    const { browser, page } = makeMockBrowser(async url => {
      if (url === 'http://localhost:3000/') throw new Error('ERR_CONNECTION_REFUSED');
      return { status: () => 200 };
    });

    const result = await checkQaBaseReachableWithBrowser(browser, 'http://localhost:3000', {
      timeoutMs: 1000,
    });

    expect(result).toEqual({ ok: true, status: 200, url: 'http://127.0.0.1:3000/' });
    expect(page.goto).toHaveBeenCalledTimes(2);
  });

  test('browser health check의 HTTP 500은 qa:runtime 사전 실패로 보고한다', async () => {
    const { browser } = makeMockBrowser(async () => ({ status: () => 500 }));

    await expect(
      assertQaBaseReachableWithBrowser(browser, 'http://localhost:3000', { timeoutMs: 1000 })
    ).rejects.toThrow(/HTTP 500/);
  });
});
