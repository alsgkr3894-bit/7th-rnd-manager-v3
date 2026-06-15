import { describe, expect, test } from '@jest/globals';
import { normalizeSidebarOpenIds } from '../../lib/ui/sidebar-state.js';
import { MOBILE_TAB_DEFS, NAV_SECTIONS } from '../../lib/menu.js';
import {
  COST_COMMON_GROUPS_ROUTE,
  COST_MARGIN_ROUTE,
  MENU_MASTER_ROUTE,
} from '../../lib/cost/routes.js';

const knownGroupId = NAV_SECTIONS[0].groups[0].id;
const navChildren = NAV_SECTIONS.flatMap(section =>
  section.groups.flatMap(group => group.children || [group])
);

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
    expect(hrefs).not.toContain('/cost/recipe-master');
    expect(hrefs).not.toContain('/cost/pizza');
    expect(hrefs).not.toContain('/cost/personal');
    expect(hrefs).not.toContain('/cost/side');
    expect(hrefs).not.toContain('/cost/set');
  });

  test('모바일 원가 탭도 구형 피자 원가표 대신 원가마진표로 이동한다', () => {
    const costTab = MOBILE_TAB_DEFS.find(item => item.label === '원가');

    expect(costTab?.href).toBe(COST_MARGIN_ROUTE);
  });
});
