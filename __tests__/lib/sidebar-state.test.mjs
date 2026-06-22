import { describe, expect, test } from '@jest/globals';
import { normalizeSidebarOpenIds } from '../../lib/ui/sidebar-state.js';
import {
  MOBILE_TAB_DEFS,
  NAV_HOME,
  NAV_SECTIONS,
  filterNavSectionsForRole,
  isNavItemVisibleForRole,
} from '../../lib/menu.js';
import { KIND_META } from '../../lib/report/constants.js';
import {
  COST_COMMON_EDGES_ROUTE,
  COST_COMMON_GROUPS_ROUTE,
  COST_MARGIN_ROUTE,
  MENU_MASTER_ROUTE,
} from '../../lib/cost/routes.js';

const knownGroupId = NAV_SECTIONS[0].groups[0].id;
const navChildren = NAV_SECTIONS.flatMap(section =>
  section.groups.flatMap(group => group.children || [group])
);

describe('sidebar navigation order', () => {
  test('요청한 카테고리 흐름대로 사이드바 그룹을 노출한다', () => {
    const visibleOrder = [
      NAV_HOME.label,
      ...NAV_SECTIONS.flatMap(section => section.groups.map(group => group.label)),
    ];

    expect(visibleOrder).toEqual([
      '홈',
      '메뉴개발노트',
      '보고서',
      '제때데이터',
      '식자재',
      '메뉴',
      '원가계산',
      '영양성분',
      '메뉴 판매량',
      '설정 / 백업',
    ]);
  });

  test('모바일 하단 탭도 요청 흐름에 맞춘 대표 탭 순서를 유지한다', () => {
    expect(MOBILE_TAB_DEFS.map(item => item.label)).toEqual([
      '홈',
      '노트',
      '보고서',
      '원가',
      '판매량',
    ]);
  });
});

describe('normalizeSidebarOpenIds', () => {
  test('객체가 아니면 빈 상태로 복구한다', () => {
    expect(normalizeSidebarOpenIds(null)).toEqual({});
    expect(normalizeSidebarOpenIds(['bad'])).toEqual({});
  });

  test('알려진 그룹의 boolean 값만 보존한다', () => {
    expect(
      normalizeSidebarOpenIds({
        [knownGroupId]: true,
        'unknown-group': true,
        another: 'open',
      })
    ).toEqual({ [knownGroupId]: true });
  });

  test('닫힌 boolean 상태도 기존 저장 형식대로 보존한다', () => {
    expect(normalizeSidebarOpenIds({ [knownGroupId]: false })).toEqual({
      [knownGroupId]: false,
    });
  });

  test('통합 후 중복 레시피/세부 원가 route를 사이드바에 노출하지 않는다', () => {
    const hrefs = navChildren.map(item => item.href).filter(Boolean);

    expect(hrefs).toContain(MENU_MASTER_ROUTE);
    expect(hrefs).toContain(COST_COMMON_GROUPS_ROUTE);
    expect(hrefs).toContain(COST_MARGIN_ROUTE);
    expect(COST_COMMON_EDGES_ROUTE).toBe('/cost/recipe?tab=edges');
    expect(hrefs).not.toContain('/cost/recipe-master');
    expect(hrefs).not.toContain('/cost/edge-dough');
    expect(hrefs).not.toContain('/cost/pizza');
    expect(hrefs).not.toContain('/cost/personal');
    expect(hrefs).not.toContain('/cost/side');
    expect(hrefs).not.toContain('/cost/set');
  });

  test('식자재 통합 후 리스트와 단가표 중복 route를 사이드바에 노출하지 않는다', () => {
    const hrefs = navChildren.map(item => item.href).filter(Boolean);

    expect(hrefs).toContain('/ingredient/manage');
    expect(hrefs).toContain('/ingredient/usage');
    expect(hrefs).not.toContain('/ingredient/list');
    expect(hrefs).not.toContain('/cost/ingredient-price');
  });

  test('제때데이터는 단가, 출고량, 관리품목 흐름으로 노출한다', () => {
    const jetteGroup = NAV_SECTIONS.flatMap(section => section.groups).find(
      group => group.id === 'jette'
    );

    expect(jetteGroup?.label).toBe('제때데이터');
    expect((jetteGroup?.children || []).map(item => item.label)).toEqual([
      '단가',
      '출고량',
      '관리품목',
    ]);
    expect((jetteGroup?.children || []).map(item => item.href)).toEqual([
      '/jette/price-compare',
      '/jette/shipment',
      '/jette/settings',
    ]);
  });

  test('보고서 사이드바는 보고서 종류 메타의 5종 생성 route를 노출한다', () => {
    const reportGroup = NAV_SECTIONS.flatMap(section => section.groups).find(
      group => group.id === 'report'
    );
    const reportHrefs = (reportGroup?.children || []).map(item => item.href);

    expect(reportHrefs).toEqual(['/report', ...Object.values(KIND_META).map(kind => kind.href)]);
    expect(reportHrefs).toContain('/report/menu-sales-compare');
  });

  test('모바일 원가 탭도 구형 피자 원가표 대신 원가마진표로 이동한다', () => {
    const costTab = MOBILE_TAB_DEFS.find(item => item.label === '원가');

    expect(costTab?.href).toBe(COST_MARGIN_ROUTE);
  });

  test('사이드바 쓰기 전용 진입점은 viewer에게 숨긴다', () => {
    const editOnlyHrefs = ['/note/write', '/menu-sales/upload', '/settings/restore'];
    const adminHrefs = filterNavSectionsForRole(NAV_SECTIONS, true)
      .flatMap(section => section.groups)
      .flatMap(group => group.children || [group])
      .map(item => item.href);
    const viewerHrefs = filterNavSectionsForRole(NAV_SECTIONS, false)
      .flatMap(section => section.groups)
      .flatMap(group => group.children || [group])
      .map(item => item.href);

    for (const href of editOnlyHrefs) {
      const item = navChildren.find(child => child.href === href);
      expect(item?.requiresEdit).toBe(true);
      expect(isNavItemVisibleForRole(item, false)).toBe(false);
      expect(isNavItemVisibleForRole(item, true)).toBe(true);
      expect(adminHrefs).toContain(href);
      expect(viewerHrefs).not.toContain(href);
    }
  });
});
