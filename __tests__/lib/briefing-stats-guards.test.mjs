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
  getSalesKpi.mockResolvedValue({
    year: 2026,
    month: 5,
    current: 0,
    deltaPct: null,
    sparkline: [],
  });
  getNoteKpi.mockResolvedValue({ total: 0 });
  getCostAlertData.mockResolvedValue(null);
});

describe('briefing stats guards', () => {
  test('하위 통계가 실패해도 anchor 기준 기본 브리핑을 반환한다', async () => {
    getSalesKpi.mockRejectedValue(new Error('sales failed'));

    const result = await getMonthlyBriefing({ year: 2026, month: 5 });

    expect(result.rangeLabel).toBe('2026년 5월');
    expect(result.chips).toEqual([
      expect.objectContaining({ label: '이번 달 판매량', value: 0, tone: 'muted' }),
      expect.objectContaining({ label: '전월 대비', value: 0, unit: '%' }),
      expect.objectContaining({ label: '최근 평균', value: 0, deltaText: '0개월 기준' }),
    ]);
    expect(result.chips.map(chip => chip.label)).not.toContain('신규 노트');
    expect(result.chips.map(chip => chip.label)).not.toContain('원가율 경보');
    expect(result.spark).toEqual([]);
    expect(getNoteKpi).not.toHaveBeenCalled();
    expect(getCostAlertData).not.toHaveBeenCalled();
    expect(getAll).not.toHaveBeenCalled();
  });

  test('손상된 판매 값을 표시 가능한 판매량 브리핑 값으로 정규화한다', async () => {
    getSalesKpi.mockResolvedValue({
      year: '2026',
      month: '6',
      current: '120',
      deltaPct: '5.5',
      sparkline: ['1', 'bad', 2, null],
    });

    const result = await getMonthlyBriefing();

    expect(result.rangeLabel).toBe('2026년 6월');
    expect(result.chips).toEqual([
      expect.objectContaining({ label: '이번 달 판매량', value: 120, tone: 'up' }),
      expect.objectContaining({ label: '전월 대비', value: 5.5, unit: '%', tone: 'up' }),
      expect.objectContaining({
        label: '최근 평균',
        value: 1,
        unit: '개',
        deltaText: '4개월 기준',
      }),
    ]);
    expect(result.sentence.map(part => part.text).join('')).not.toContain('신규 노트');
    expect(result.spark).toEqual([1, 0, 2, 0]);
  });
});
