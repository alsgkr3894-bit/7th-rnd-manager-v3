import { describe, expect, test } from '@jest/globals';
import {
  MENU_SALES_ANALYSIS_ROUTE,
  MENU_SALES_HUB_GROUPS,
  MENU_SALES_LEGACY_ANALYSIS_ROUTES,
} from '../../lib/sales/navigation.js';
import { PALETTE_STATIC_ITEMS } from '../../hooks/usePaletteItems.js';

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

  test('검색 팔레트도 단일 분석 route만 노출한다', () => {
    const hrefs = PALETTE_STATIC_ITEMS.map(item => item.href);
    expect(hrefs).toContain(MENU_SALES_ANALYSIS_ROUTE);
    for (const legacyRoute of MENU_SALES_LEGACY_ANALYSIS_ROUTES) {
      expect(hrefs).not.toContain(legacyRoute);
    }
    expect(hrefs.filter(href => href === MENU_SALES_ANALYSIS_ROUTE)).toHaveLength(1);
  });
});
