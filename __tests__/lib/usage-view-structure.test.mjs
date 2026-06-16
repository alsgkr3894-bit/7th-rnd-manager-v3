import { describe, expect, test } from '@jest/globals';
import {
  buildIngredientUsageRows,
  getUsageRowsSummary,
  getUsageTier,
  shouldShowUsageTier,
  sortIngredientUsageRows,
  usageCountBadgeStyle,
  usageNameKey,
} from '../../components/cost/ingredient-price/usage-view/usageViewUtils.js';

describe('usage view structure', () => {
  test('helpers keep lookup, filtering, sorting, tiers, and summary counts stable', () => {
    const usageMap = {
      byCode: new Map([
        [
          'A',
          new Map([
            ['페퍼로니 피자', '피자'],
            ['감자튀김', '사이드'],
          ]),
        ],
      ]),
      byName: new Map([
        ['모짜치즈', new Map([['1인 페퍼로니', '1인피자']])],
        ['도우', new Map([['고구마피자', '피자']])],
      ]),
    };
    const rows = [
      { meta: { productCode: 'A' }, masterName: '모짜 치즈', productName: '치즈', scope: '전용' },
      { productCode: 'B', masterName: '', productName: '도우' },
      { productCode: 'C', masterName: '미사용', productName: '미사용' },
    ];

    const allRows = buildIngredientUsageRows({ rows, usageMap, usageCat: '전체' });
    expect(usageNameKey(' 모짜 치즈 ')).toBe('모짜치즈');
    expect(allRows).toHaveLength(2);
    expect(allRows[0]).toMatchObject({
      uid: 'A',
      code: 'A',
      name: '모짜 치즈',
      scope: '전용',
      count: 3,
      pizzaCount: 2,
      sideCount: 1,
    });
    expect(allRows[1]).toMatchObject({ uid: 'B', count: 1, pizzaCount: 1, sideCount: 0 });

    const pizzaRows = buildIngredientUsageRows({ rows, usageMap, usageCat: '피자' });
    expect(pizzaRows.map(row => [row.uid, row.count])).toEqual([
      ['A', 1],
      ['B', 1],
    ]);
    expect(sortIngredientUsageRows(allRows, 'count_asc').map(row => row.uid)).toEqual(['B', 'A']);
    expect(sortIngredientUsageRows(allRows, 'name_asc').map(row => row.uid)).toEqual(['B', 'A']);
    expect(getUsageRowsSummary(allRows)).toEqual({ total: 4, pizza: 3, side: 1 });
    expect(getUsageTier(8)).toBe(0);
    expect(getUsageTier(4)).toBe(1);
    expect(getUsageTier(1)).toBe(2);
    expect(
      shouldShowUsageTier({
        rows: [{ count: 8 }, { count: 5 }, { count: 1 }],
        index: 1,
        usageSort: 'count_desc',
      })
    ).toBe(true);
    expect(
      shouldShowUsageTier({
        rows: [{ count: 8 }, { count: 5 }],
        index: 1,
        usageSort: 'name_asc',
      })
    ).toBe(false);
    expect(usageCountBadgeStyle(8)).toMatchObject({ background: '#DBEAFE' });
    expect(usageCountBadgeStyle(4)).toMatchObject({ background: '#D1FAE5' });
    expect(usageCountBadgeStyle(1)).toMatchObject({ background: 'var(--surface-2)' });
  });
});
