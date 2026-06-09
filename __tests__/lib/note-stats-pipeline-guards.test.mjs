import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();

const dbMock = {
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
};

jest.unstable_mockModule('@/lib/db', () => dbMock);
jest.unstable_mockModule('../../lib/db/index.js', () => dbMock);

jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: jest.fn(),
  getPriceRowsByFileId: jest.fn(),
}));

jest.unstable_mockModule('@/lib/recipe', () => ({
  buildUnitPriceMap: jest.fn(() => new Map()),
  calcCostBySizes: jest.fn(() => ({})),
  calcMarginRate: jest.fn(() => null),
}));

const { getNoteDetailStats, getPipelineStats } = await import('../../lib/stats/note-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
});

describe('note stats display guards', () => {
  test('파이프라인 통계는 깨진 표시값과 날짜가 있어도 안전하게 집계한다', async () => {
    const now = new Date();
    const quarterRelease = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      2
    ).toISOString();

    getAll.mockResolvedValue([
      null,
      'bad',
      { status: '아이디어', menuName: 123, createdAt: 200 },
      { status: '아이디어', title: '새 아이디어', createdAt: '2026-06-01T00:00:00.000Z' },
      { status: '테스트중', menuName: '테스트', createdAt: {} },
      { status: '출시', menuName: '출시', createdAt: quarterRelease },
      { status: '', menuName: '빈 상태' },
    ]);

    const result = await getPipelineStats();
    const idea = result.columns.find(col => col.key === 'idea');
    const testing = result.columns.find(col => col.key === 'testing');
    const released = result.columns.find(col => col.key === 'released');

    expect(idea).toMatchObject({
      count: 2,
      items: ['새 아이디어', '123'],
      more: 0,
    });
    expect(testing).toMatchObject({ count: 1, items: ['테스트'] });
    expect(released).toMatchObject({ count: 1, items: ['출시'] });
    expect(result.quarterGoal).toEqual({ done: 1, target: 6 });
  });

  test('상세 통계는 빈 상태와 카테고리를 fallback 라벨로 집계하고 잘못된 날짜를 무시한다', async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();

    getAll.mockResolvedValue([
      { status: undefined, category: undefined, createdAt: thisMonth },
      { status: '', category: '', createdAt: {} },
      { status: '출시', category: '피자', createdAt: previousMonth },
      { status: 7, category: 9, createdAt: 300 },
    ]);

    const result = await getNoteDetailStats();

    expect(result.total).toBe(4);
    expect(result.thisMonth).toBe(1);
    expect(result.released).toBe(1);
    expect(result.releaseRate).toBe(25);
    expect(result.byStatus).toMatchObject({ 미지정: 2, 출시: 1, 7: 1 });
    expect(result.byCategory).toMatchObject({ 미분류: 2, 피자: 1, 9: 1 });
    expect(result.monthly.reduce((sum, row) => sum + row.count, 0)).toBeGreaterThanOrEqual(2);
  });
});
