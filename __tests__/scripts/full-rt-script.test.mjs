import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  CHINA4_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
} from '../../lib/navigation/route-classification.js';

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
      '/settings/brands',
      '/settings/system',
      '/settings/account',
    ];

    for (const route of expectedRoutes) {
      expect(MAIN_RUNTIME_ROUTES).toContain(route);
    }
  });

  test('브랜드별 직접 진입 route도 분류표에서 공급한다', () => {
    expect(CHINA4_RUNTIME_ROUTES).toEqual(
      expect.arrayContaining([
        '/',
        '/menu-master',
        '/cost/edge-dough',
        '/ingredient/manage',
        '/menu-sales/settings',
        '/note',
        '/settings/backup',
        '/settings/restore',
      ])
    );
    expect(CHINA4_DIRECT_RUNTIME_ROUTES).toEqual([
      '/note',
      '/note/write',
      '/note/calendar',
      '/note/sample',
    ]);
  });

  test('동적 상세 라우트는 fixture seed 후 직접 진입 검사한다', () => {
    expect(script).toContain('DYNAMIC_FIXTURE_ROUTES');
    expect(script).toContain('/note/900001');
    expect(script).toContain('/note/sample/900001');
    expect(script).toContain('seedDynamicRouteFixtures');
    expect(script).toContain("tx.objectStore('menu_dev_notes').put");
    expect(script).toContain("tx.objectStore('sample_records').put");
  });
});
