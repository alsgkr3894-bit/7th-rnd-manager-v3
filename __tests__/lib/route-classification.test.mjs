import { describe, expect, test } from '@jest/globals';
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
  MOBILE_PRIMARY_ROUTES,
  ROUTE_CLASSIFICATIONS,
  ROUTE_KIND,
  ROUTE_MARKER,
} from '../../lib/navigation/route-classification.js';
import { MOBILE_TAB_DEFS } from '../../lib/menu.js';

function collectPageRoutes(dir = resolve('app')) {
  const routes = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(next);
        continue;
      }
      if (!/^page\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;
      const routeDir = relative(resolve('app'), current).split('\\').join('/');
      routes.push(routeDir ? `/${routeDir}` : '/');
    }
  }
  walk(dir);
  return routes.sort();
}

describe('route classification', () => {
  test('정적 route 분류는 중복 route를 갖지 않는다', () => {
    const routes = ROUTE_CLASSIFICATIONS.map(item => item.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  test('모든 app page route는 route 분류표에 포함된다', () => {
    const classified = new Set(ROUTE_CLASSIFICATIONS.map(item => item.route));
    const missing = collectPageRoutes().filter(route => !classified.has(route));

    expect(missing).toEqual([]);
  });

  test('legacy route는 redirect로 분류하고 canonical target을 기록한다', () => {
    expect(ROUTE_CLASSIFICATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/cost/edge-dough',
          kind: ROUTE_KIND.REDIRECT,
          target: '/cost/recipe?tab=edges',
        }),
        expect.objectContaining({
          route: '/menu-sales/rank',
          kind: ROUTE_KIND.REDIRECT,
          target: '/menu-sales/rank-compare',
        }),
        expect.objectContaining({
          route: '/ingredient/list',
          kind: ROUTE_KIND.REDIRECT,
          target: '/ingredient/manage',
        }),
        expect.objectContaining({
          route: '/cost/recipe-master',
          kind: ROUTE_KIND.REDIRECT,
          target: '/menu-master',
        }),
      ])
    );
  });

  test('runtime QA route는 분류표에서 파생한다', () => {
    expect(MAIN_RUNTIME_ROUTES).toEqual(
      expect.arrayContaining([
        '/cost/manage',
        '/nutrition/export',
        '/report/menu-sales-compare',
        '/settings/brands',
      ])
    );
    expect(CHINA4_DIRECT_RUNTIME_ROUTES).toEqual([
      '/note',
      '/note/write',
      '/note/calendar',
      '/note/sample',
    ]);
  });

  test('모바일 primary route는 하단 탭 정의와 같은 marker로 분류한다', () => {
    const mobileRoutes = MOBILE_TAB_DEFS.map(item => item.href);

    expect(MOBILE_PRIMARY_ROUTES).toEqual(mobileRoutes);
    expect(ROUTE_CLASSIFICATIONS).toEqual(
      expect.arrayContaining(
        mobileRoutes.map(route =>
          expect.objectContaining({
            route,
            markers: expect.arrayContaining([ROUTE_MARKER.MOBILE_PRIMARY]),
          })
        )
      )
    );
  });
});
