import { describe, expect, test } from '@jest/globals';
import { JETTE_HUB_GROUPS, JETTE_NAV_ITEMS } from '../../lib/jette/navigation.js';

describe('jette navigation', () => {
  test('제때 허브는 단가, 출고량, 관리품목 흐름을 노출한다', () => {
    expect(JETTE_HUB_GROUPS.map(group => group.label)).toEqual(['단가', '출고량', '관리품목']);
    expect(JETTE_HUB_GROUPS.flatMap(group => group.items).map(item => item.href)).toEqual([
      '/jette/price-compare',
      '/jette/shipment',
      '/jette/settings',
    ]);
  });

  test('사이드바 항목도 허브와 같은 route를 사용한다', () => {
    expect(JETTE_NAV_ITEMS.map(item => item.label)).toEqual(['단가', '출고량', '관리품목']);
    expect(JETTE_NAV_ITEMS.map(item => item.href)).toEqual(
      JETTE_HUB_GROUPS.flatMap(group => group.items).map(item => item.href)
    );
  });
});
