import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
}));

const { getIssues } = await import('../../lib/sales/store-issues.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
});

describe('sales issue store guards', () => {
  test('스토어가 없으면 빈 목록을 반환하고 조회하지 않는다', async () => {
    hasStore.mockReturnValue(false);

    await expect(getIssues()).resolves.toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
  });

  test('깨진 행을 무시하고 상태·기간 필터를 안전하게 적용한다', async () => {
    getAll.mockResolvedValue([
      null,
      'bad',
      { id: 1, status: 'open', year: '2026', month: '5', totalQuantity: '7' },
      { id: 2, status: 'resolved', year: 2026, month: 5, totalQuantity: 10 },
      { id: 3, status: 'open', year: 2026, month: 4, totalQuantity: 20 },
    ]);

    const result = await getIssues({ status: 'open', year: 2026, month: '5' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1 });
  });

  test('잘못된 옵션 객체와 수량 값에서도 최신 기간순 정렬을 유지한다', async () => {
    getAll.mockResolvedValue([
      { id: 1, status: 'open', year: 2025, month: 12, totalQuantity: 100 },
      { id: 2, status: 'open', year: '2026', month: '1', totalQuantity: 'bad' },
      { id: 3, status: 'open', year: 2026, month: 1, totalQuantity: 5 },
    ]);

    const result = await getIssues('bad');

    expect(result.map(issue => issue.id)).toEqual([3, 2, 1]);
  });
});
