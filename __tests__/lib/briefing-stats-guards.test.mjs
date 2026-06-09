import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getSalesKpi = jest.fn();
const getNoteKpi = jest.fn();
const getCostAlertData = jest.fn();
const hasStore = jest.fn();
const getAll = jest.fn();

jest.unstable_mockModule('../../lib/stats/sales-stats.js', () => ({
  getSalesKpi: (...args) => getSalesKpi(...args),
}));

jest.unstable_mockModule('../../lib/stats/note-stats.js', () => ({
  getNoteKpi: (...args) => getNoteKpi(...args),
}));

jest.unstable_mockModule('../../lib/stats/cost-stats.js', () => ({
  getCostAlertData: (...args) => getCostAlertData(...args),
}));

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
}));

const { getMonthlyBriefing } = await import('../../lib/stats/briefing-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
  getSalesKpi.mockResolvedValue({ year: 2026, month: 5, current: 0, deltaPct: null, sparkline: [] });
  getNoteKpi.mockResolvedValue({ total: 0, reporting: 0 });
  getCostAlertData.mockResolvedValue(null);
});

describe('briefing stats guards', () => {
  test('하위 통계가 실패해도 anchor 기준 기본 브리핑을 반환한다', async () => {
    getSalesKpi.mockRejectedValue(new Error('sales failed'));
    getNoteKpi.mockRejectedValue(new Error('note failed'));
    getCostAlertData.mockResolvedValue({
      items: [null, 'bad', { costRate: '45' }, { costRate: 'bad' }],
    });
    getAll.mockResolvedValue([
      null,
      { createdAt: '2026-05-02T00:00:00.000Z' },
      { createdAt: '2026-04-30T00:00:00.000Z' },
    ]);

    const result = await getMonthlyBriefing({ year: 2026, month: 5 });

    expect(result.rangeLabel).toBe('2026년 5월');
    expect(result.chips).toEqual([
      expect.objectContaining({ label: '이번 달 판매량', value: 0, tone: 'muted' }),
      expect.objectContaining({ label: '신규 노트', value: 1, deltaText: '누적 0건' }),
      expect.objectContaining({ label: '보고예정', value: 0, deltaText: '대기 없음' }),
      expect.objectContaining({ label: '원가율 경보', value: 1, tone: 'down' }),
    ]);
    expect(result.spark).toEqual([]);
  });

  test('손상된 판매·노트·경보 값을 표시 가능한 값으로 정규화한다', async () => {
    getSalesKpi.mockResolvedValue({
      year: '2026',
      month: '6',
      current: '120',
      deltaPct: '5.5',
      sparkline: ['1', 'bad', 2, null],
    });
    getNoteKpi.mockResolvedValue({ total: '3', reporting: '2' });
    getCostAlertData.mockResolvedValue({
      items: [{ costRate: 41 }, { costRate: '40' }, { costRate: 'bad' }],
    });
    getAll.mockResolvedValue([{ createdAt: '2026-06-01T00:00:00.000Z' }]);

    const result = await getMonthlyBriefing();

    expect(result.rangeLabel).toBe('2026년 6월');
    expect(result.chips).toEqual([
      expect.objectContaining({ label: '이번 달 판매량', value: 120, tone: 'up' }),
      expect.objectContaining({ label: '신규 노트', value: 1, deltaText: '누적 3건' }),
      expect.objectContaining({ label: '보고예정', value: 2, deltaText: '확인 대기' }),
      expect.objectContaining({ label: '원가율 경보', value: 1, tone: 'down' }),
    ]);
    expect(result.spark).toEqual([1, 0, 2, 0]);
  });
});
