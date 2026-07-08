import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  MENU_SALES_ANALYSIS_ROUTE,
  MENU_SALES_HUB_GROUPS,
  MENU_SALES_LEGACY_ANALYSIS_ROUTES,
} from '../../lib/sales/navigation.js';
import { PALETTE_STATIC_ITEMS, isPaletteItemVisibleForRole } from '../../hooks/usePaletteItems.js';
import {
  filterRoleVisibleGroups,
  getRoleSafeHref,
  isEditOnlyHref,
} from '../../lib/navigation/role-visibility.js';

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

  test('검색 팔레트의 노트 동적 로드는 표시 전용 캐시 함수를 사용한다', () => {
    const source = readFileSync(resolve('hooks/usePaletteItems.js'), 'utf8');

    expect(source).toContain('getAllNotesCached');
    expect(source).not.toContain('({ getAllNotes }) => getAllNotes()');
  });

  test('검색 팔레트 동적 로드는 닫힌 뒤 state 업데이트를 막는다', () => {
    const source = readFileSync(resolve('hooks/usePaletteItems.js'), 'utf8');

    expect(source).toContain('let alive = true');
    expect(source).toContain('if (!alive) return');
    expect(source).toContain('if (alive) console.warn');
    expect(source).toContain('alive = false');
  });

  test('검색 팔레트 쓰기 전용 진입점은 viewer에게 숨긴다', () => {
    const writeHrefs = [
      '/note/write',
      '/note/write?type=sample',
      '/note/sample/write',
      '/menu-sales/upload',
    ];

    for (const href of writeHrefs) {
      expect(isPaletteItemVisibleForRole({ href, label: href }, false)).toBe(false);
      expect(isPaletteItemVisibleForRole({ href, label: href }, true)).toBe(true);
    }

    const visibleForViewer = PALETTE_STATIC_ITEMS.filter(item =>
      isPaletteItemVisibleForRole(item, false)
    );
    expect(visibleForViewer.map(item => item.href)).not.toContain('/note/write');
    expect(visibleForViewer.map(item => item.href)).not.toContain('/note/write?type=sample');
    expect(visibleForViewer.map(item => item.href)).not.toContain('/note/sample/write');
    expect(visibleForViewer.map(item => item.href)).not.toContain('/menu-sales/upload');
  });

  test('판매량 허브 업로드 카드는 viewer에게 숨기고 안전한 읽기 route를 제공한다', () => {
    const visibleForViewer = filterRoleVisibleGroups(MENU_SALES_HUB_GROUPS, false);
    const visibleForAdmin = filterRoleVisibleGroups(MENU_SALES_HUB_GROUPS, true);
    const viewerHrefs = visibleForViewer.flatMap(group => group.items || []).map(item => item.href);
    const adminHrefs = visibleForAdmin.flatMap(group => group.items || []).map(item => item.href);

    expect(isEditOnlyHref('/menu-sales/upload')).toBe(true);
    expect(getRoleSafeHref('/menu-sales/upload', false)).toBe(MENU_SALES_ANALYSIS_ROUTE);
    expect(adminHrefs).toContain('/menu-sales/upload');
    expect(viewerHrefs).not.toContain('/menu-sales/upload');
  });
});
