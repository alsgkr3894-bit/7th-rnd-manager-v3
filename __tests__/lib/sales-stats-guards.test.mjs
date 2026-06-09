import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();

const dbMock = {
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
};

jest.unstable_mockModule('../../lib/db/index.js', () => dbMock);

const {
  getCategoryShare,
  getSalesKpi,
  getTopMenus,
  getTopMenusWithTrend,
} = await import('../../lib/stats/sales-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
});

describe('sales stats display guards', () => {
  test('깨진 표시값과 비정상 수량을 안전하게 집계한다', async () => {
    const anchor = { year: 2026, month: 5 };

    getAll.mockResolvedValue([
      null,
      'bad',
      {
        year: 2026,
        month: 5,
        status: 'classified',
        quantity: '10',
        category: {},
        groupName: {},
        mappedMenuName: {},
        normalizedMenuName: '피자A',
      },
      {
        year: 2026,
        month: 5,
        status: 'classified',
        quantity: Infinity,
        category: '피자',
        rawMenuName: {},
      },
      {
        year: 2026,
        month: 5,
        status: 'classified',
        quantity: 'bad',
        category: '사이드',
        mappedMenuName: '감자',
      },
      {
        year: 2026,
        month: 4,
        status: 'classified',
        quantity: '5',
        category: '피자',
        mappedMenuName: '피자A',
      },
      {
        year: 2026,
        month: 5,
        status: 'unmatched',
        quantity: 999,
        category: '피자',
        mappedMenuName: '제외',
      },
    ]);

    await expect(getSalesKpi(anchor)).resolves.toMatchObject({
      current: 10,
      prev: 5,
      deltaPct: 100,
      year: 2026,
      month: 5,
    });

    await expect(getCategoryShare(anchor)).resolves.toMatchObject({
      total: 10,
      items: [
        expect.objectContaining({ name: '미분류', value: 10 }),
        expect.objectContaining({ name: '피자', value: 0 }),
        expect.objectContaining({ name: '사이드', value: 0 }),
      ],
    });

    await expect(getTopMenus(5, '미분류', true, 'desc', anchor)).resolves.toEqual([
      { rank: 1, name: '피자A', quantity: 10 },
    ]);

    await expect(getTopMenusWithTrend(5, null, true, 'desc', anchor)).resolves.toEqual([
      { rank: 1, name: '피자A', quantity: 10, spark: [0, 0, 0, 0, 5, 10] },
    ]);
  });
});
