import { describe, expect, test } from '@jest/globals';
import nextConfig from '../../next.config.mjs';

describe('기본 웹 보안 헤더', () => {
  test('모든 경로에서 클릭재킹·MIME 스니핑·불필요한 장치 권한을 차단한다', async () => {
    const rules = await nextConfig.headers();
    const allRoutes = rules.find(rule => rule.source === '/:path*');
    const headers = Object.fromEntries(allRoutes.headers.map(({ key, value }) => [key, value]));

    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Permissions-Policy']).toContain('microphone=()');
  });

  test('바깥 출처의 스크립트·연결·폼 전송을 막고, 개발용 완화는 넣지 않는다', async () => {
    const rules = await nextConfig.headers();
    const csp = rules
      .find(rule => rule.source === '/:path*')
      .headers.find(header => header.key === 'Content-Security-Policy').value;
    const directive = name => csp.split('; ').find(part => part.startsWith(`${name} `));

    expect(directive('default-src')).toBe("default-src 'self'");
    expect(directive('script-src')).toBe("script-src 'self' 'unsafe-inline'");
    expect(directive('connect-src')).toBe("connect-src 'self' data: blob: https://api.ipify.org");
    expect(directive('form-action')).toBe("form-action 'self'");
    expect(csp).not.toContain('unsafe-eval');
  });

  test('API 응답은 저장하지 않고 서버 종류를 알리지 않는다', async () => {
    const rules = await nextConfig.headers();
    expect(rules.find(rule => rule.source === '/api/:path*').headers).toEqual([
      { key: 'Cache-Control', value: 'no-store' },
    ]);
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
