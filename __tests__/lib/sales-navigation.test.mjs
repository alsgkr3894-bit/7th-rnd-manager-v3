import { describe, expect, test } from '@jest/globals';
import {
  MENU_SALES_ANALYSIS_ROUTE,
  MENU_SALES_HUB_GROUPS,
  MENU_SALES_LEGACY_ANALYSIS_ROUTES,
} from '../../lib/sales/navigation.js';

function hubHrefs() {
  return MENU_SALES_HUB_GROUPS.flatMap(group => group.items || []).map(item => item.href);
}

describe('menu sales navigation', () => {
  test('판매량 허브는 업로드, 미매칭, 단일 분석, 분류 규칙 흐름을 노출한다', () => {
    expect(hubHrefs()).toEqual([
      '/menu-sales/upload',
      '/menu-sales/unmatched',
      MENU_SALES_ANALYSIS_ROUTE,
      '/menu-sales/settings',
    ]);
  });

  test('구형 분석 route는 허브에 직접 노출하지 않는다', () => {
    const hrefs = hubHrefs();
    for (const legacyRoute of MENU_SALES_LEGACY_ANALYSIS_ROUTES) {
      expect(hrefs).not.toContain(legacyRoute);
    }
  });
});
