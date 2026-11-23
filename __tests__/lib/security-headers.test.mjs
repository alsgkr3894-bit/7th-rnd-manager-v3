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
});
