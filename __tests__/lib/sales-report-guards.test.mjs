import { describe, expect, test } from '@jest/globals';
import { buildCategoryDetails, buildCategoryShare } from '../../lib/sales/category.js';
import { buildOrderedCategories } from '../../lib/sales/categories.js';
import { buildPeriodCompare, deriveCompareB } from '../../lib/sales/compare.js';
import { buildGroupRanking, extractSize } from '../../lib/sales/ranking.js';
import { formatShareText } from '../../lib/sales/share-formatter.js';

const row = {
  status: 'classified',
  year: 2026,
  month: 5,
  category: 'pizza',
  groupName: '슈퍼콤비네이션',
  mappedMenuName: '슈퍼콤비네이션 L',
  detailName: '슈퍼콤비네이션 L',
  quantity: 10,
};

describe('sales report helper guards', () => {
  test('buildGroupRanking은 배열이 아닌 입력을 빈 순위로 처리한다', () => {
    expect(buildGroupRanking(null, { year: 2026, month: 5 })).toEqual([]);
    expect(buildGroupRanking({}, { year: 2026, month: 5 })).toEqual([]);
  });

  test('buildGroupRanking은 객체가 아닌 행을 무시하고 정상 집계를 유지한다', () => {
    const result = buildGroupRanking([null, 'bad', row], { year: '2026', month: '5' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: '슈퍼콤비네이션',
      category: 'pizza',
      quantity: 10,
    });
    expect(result[0].sizes[0]).toMatchObject({ size: 'L', quantity: 10, share: 1 });
  });

  test('buildPeriodCompare는 비배열 입력과 잘못된 옵션을 안전하게 처리한다', () => {
    expect(
      buildPeriodCompare(null, { year: 2026, month: 5 }, { year: 2026, month: 4 })
    ).toMatchObject({
      totalA: 0,
      totalB: 0,
      rows: [],
    });

    const result = buildPeriodCompare(
      [null, row, { ...row, month: 4, quantity: 7 }],
      { year: '2026', month: '5' },
      { year: '2026', month: '4' },
      { groupBy: 'group', category: [], topN: 'bad' }
    );

    expect(result).toMatchObject({
      totalA: 10,
      totalB: 7,
      totalDiff: 3,
    });
    expect(result.rows[0]).toMatchObject({ name: '슈퍼콤비네이션', a: 10, b: 7 });
  });

  test('buildPeriodCompare는 깨진 메뉴명과 비정상 수량을 렌더 가능한 값으로 정규화한다', () => {
    const result = buildPeriodCompare(
      [
        {
          status: 'classified',
          year: 2026,
          month: 5,
          category: '피자',
          groupName: {},
          mappedMenuName: {},
          normalizedMenuName: '고구마피자',
          quantity: '12',
        },
        {
          status: 'classified',
          year: 2026,
          month: 4,
          category: '피자',
          groupName: '고구마피자',
          quantity: Infinity,
        },
        {
          status: 'classified',
          year: 2026,
          month: 5,
          category: {},
          mappedMenuName: '깨진카테고리',
          quantity: 99,
        },
      ],
      { year: 2026, month: 5 },
      { year: 2026, month: 4 },
      { groupBy: 'group', category: '피자', topN: 5 }
    );

    expect(result).toMatchObject({
      totalA: 12,
      totalB: 0,
      totalDiff: 12,
      totalPct: null,
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        name: '고구마피자',
        category: '피자',
        a: 12,
        b: 0,
        diff: 12,
        pct: null,
      }),
    ]);
    expect(result.rows[0].name).toBe('고구마피자');
  });

  test('buildCategoryDetails와 buildCategoryShare는 깨진 입력을 안전하게 무시한다', () => {
    expect(buildCategoryDetails(null, { year: 2026, month: 5 })).toEqual({
      total: 0,
      categories: [],
    });

    const details = buildCategoryDetails(
      [
        null,
        'bad',
        row,
        { ...row, quantity: '3', category: '', groupName: '' },
        {
          ...row,
          category: 'pizza',
          groupName: {},
          mappedMenuName: {},
          normalizedMenuName: '정상후보',
          quantity: '2',
        },
        { ...row, month: 6, quantity: 99 },
      ],
      { year: '2026', month: '5' },
      { groupBy: 'group', topN: 'bad' }
    );

    expect(details.total).toBe(15);
    expect(details.categories).toHaveLength(2);
    expect(details.categories[0]).toMatchObject({
      name: 'pizza',
      value: 12,
    });
    expect(details.categories[0].topMenus).toEqual([
      { name: '슈퍼콤비네이션', quantity: 10 },
      { name: '정상후보', quantity: 2 },
    ]);

    const share = buildCategoryShare([null, row, { ...row, quantity: 'bad' }], {
      year: 2026,
      month: 5,
    });
    expect(share.total).toBe(10);
    expect(share.items[0]).toMatchObject({ name: 'pizza', value: 10 });
  });

  test('buildOrderedCategories는 비정상 입력에서도 빈 목록 또는 정렬된 목록을 반환한다', () => {
    expect(buildOrderedCategories(null, null)).toEqual([]);
    expect(buildOrderedCategories(['음료', '', null, '피자', '새카테고리'], ['전체'])).toEqual([
      '전체',
      '피자',
      '음료',
      '새카테고리',
    ]);
  });

  test('formatShareText는 깨진 공유 데이터에서도 텍스트 생성을 유지한다', () => {
    expect(formatShareText()).toBe('📊 판매 순위 -');

    const single = formatShareText({
      mode: 'single',
      periodA: { year: 2026, month: 5 },
      singleMenus: [null, row, { ...row, name: null, quantity: 'bad' }],
      singleCategory: 'pizza',
    });
    expect(single).toContain('📊 판매 순위 2026년 5월');
    expect(single).toContain('1위 - — 10개');

    const compare = formatShareText({
      mode: 'mom',
      periodA: { year: 2026, month: 5 },
      periodB: { year: 2026, month: 4 },
      compare: {
        rows: [null, { name: '슈퍼콤비네이션', a: '10', b: '7' }, { name: null, a: 'bad', b: 1 }],
      },
    });
    expect(compare).toContain('비교 기간: 2026년 4월');
    expect(compare).toContain('1위 슈퍼콤비네이션 — 10개 (▲3)');
  });

  test('extractSize와 deriveCompareB는 비정상 입력에서도 기본값을 반환한다', () => {
    expect(extractSize(null, '피자')).toBe('기타');
    expect(extractSize('슈퍼콤비네이션 L', '슈퍼콤비네이션')).toBe('L');
    expect(deriveCompareB({ year: 2026, month: 1 }, 'mom')).toEqual({ year: 2025, month: 12 });
    expect(() => deriveCompareB(null, 'yoy')).not.toThrow();
  });
});
