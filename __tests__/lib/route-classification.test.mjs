import { describe, expect, test } from '@jest/globals';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
  ROUTE_CLASSIFICATIONS,
  ROUTE_KIND,
} from '../../lib/navigation/route-classification.js';

describe('route classification', () => {
  test('정적 route 분류는 중복 route를 갖지 않는다', () => {
    const routes = ROUTE_CLASSIFICATIONS.map(item => item.route);
    expect(new Set(routes).size).toBe(routes.length);
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
});
