import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getSalesKpi = jest.fn();
const getTopMenus = jest.fn();
const getUploadedFiles = jest.fn();
const getIssues = jest.fn();

jest.unstable_mockModule('../../lib/stats/sales-stats.js', () => ({
  getSalesKpi: (...args) => getSalesKpi(...args),
  getTopMenus: (...args) => getTopMenus(...args),
}));

jest.unstable_mockModule('../../lib/sales/store-files.js', () => ({
  getUploadedFiles: (...args) => getUploadedFiles(...args),
}));

jest.unstable_mockModule('../../lib/sales/store-issues.js', () => ({
  getIssues: (...args) => getIssues(...args),
}));

const { getMenuSalesDashboard } = await import('../../lib/sales/dashboard.js');

beforeEach(() => {
  jest.clearAllMocks();
  getSalesKpi.mockResolvedValue(null);
  getTopMenus.mockResolvedValue([]);
  getUploadedFiles.mockResolvedValue([]);
  getIssues.mockResolvedValue([]);
});

describe('menu sales dashboard guards', () => {
  test('조회 함수가 깨진 값을 반환해도 기본 대시보드 계약을 유지한다', async () => {
    getSalesKpi.mockResolvedValue({
      current: 'bad',
      prev: '3',
      deltaPct: 'bad',
      sparkline: [1, '2', null, 'bad'],
      year: '2026',
      month: '5',
    });
    getTopMenus
      .mockResolvedValueOnce([null, { rank: '2', name: null, quantity: '7', spark: ['1', 'bad'] }])
      .mockResolvedValueOnce('bad');
    getIssues.mockResolvedValue([null, { id: 1 }]);
    getUploadedFiles.mockResolvedValue('bad');

    const result = await getMenuSalesDashboard();

    expect(result).toEqual({
      kpi: null,
      best: [{ rank: 2, name: '-', quantity: 7, spark: [1, 0] }],
      worst: [],
      unmatchedCount: 1,
      fileCount: 0,
      latestUpload: null,
    });
  });

  test('파일이 있으면 판매량이 0이어도 최신 업로드 정보를 안전하게 반환한다', async () => {
    getSalesKpi.mockResolvedValue({
      current: 0,
      prev: '0',
      deltaPct: null,
      sparkline: [0, '1'],
      year: 2026,
      month: 5,
    });
    getUploadedFiles.mockResolvedValue([
      { id: 10, year: '2026', month: '5', fileName: 123, totalRows: '9', uploadedAt: null },
    ]);

    const result = await getMenuSalesDashboard();

    expect(result.kpi).toMatchObject({
      current: 0,
      prev: 0,
      deltaPct: null,
      sparkline: [0, 1],
      year: 2026,
      month: 5,
    });
    expect(result.fileCount).toBe(1);
    expect(result.latestUpload).toMatchObject({
      id: 10,
      year: 2026,
      month: 5,
      fileName: '123',
      totalRows: 9,
      uploadedAt: '',
    });
  });
});
