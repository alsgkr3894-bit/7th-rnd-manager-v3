import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = readFileSync(resolve('scripts/full-rt.mjs'), 'utf8');

function directEntryBlockOf(source) {
  const start = source.indexOf('if (directEntry) {');
  const end = source.indexOf('page.on(', start);
  return source.slice(start, end);
}

describe('full-rt 직접 진입 QA 스크립트', () => {
  test('라우트 검사 전 base URL browser health check를 수행한다', () => {
    const healthCheck = script.indexOf('await assertQaBaseReachableWithBrowser(browser, BASE');
    const browserLaunch = script.indexOf('const browser = await chromium.launch()');
    const mainRoutes = script.indexOf('// main 브랜드');

    expect(healthCheck).toBeGreaterThan(-1);
    expect(browserLaunch).toBeGreaterThan(-1);
    expect(mainRoutes).toBeGreaterThan(-1);
    expect(browserLaunch).toBeLessThan(healthCheck);
    expect(healthCheck).toBeLessThan(mainRoutes);
  });

  test('비-main 직접 진입은 홈 방문 없이 localStorage를 미리 주입한다', () => {
    const block = directEntryBlockOf(script);

    expect(block).toContain('ctx.addInitScript');
    expect(block).toContain('localStorage.setItem(key, val)');
    expect(block).toContain('p2.goto(routeUrl(BASE, route)');
    expect(block).not.toContain("p2.goto(routeUrl(BASE, '/')");
  });

  test('route navigation 실패는 전체 스크립트를 중단하지 않고 fatal 결과로 기록한다', () => {
    expect(script).toContain('fatal: fatalMessage(error)');
    expect(script).toContain('!r.fatal');
    expect(script).toContain("if (r.fatal) console.log('    fatal: '");
  });

  test('주요 모듈 라우트가 회귀 검사 대상에 포함된다', () => {
    const expectedRoutes = [
      '/menu-sales/upload',
      '/menu-sales/unmatched',
      '/jette/shipment',
      '/ingredient',
      '/cost/manage',
      '/nutrition/menu',
      '/nutrition/export',
      '/note/sample/write',
      '/report/price',
      '/report/shipment',
      '/settings',
      '/settings/system',
      '/settings/account',
    ];

    for (const route of expectedRoutes) {
      expect(script).toContain(`'${route}'`);
    }
  });
});
