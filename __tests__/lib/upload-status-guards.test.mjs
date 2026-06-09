import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getUploadedFiles = jest.fn();
const getShipmentFiles = jest.fn();
const getPriceFiles = jest.fn();

jest.unstable_mockModule('@/lib/sales', () => ({
  getUploadedFiles: (...args) => getUploadedFiles(...args),
}));

jest.unstable_mockModule('@/lib/shipment/store-files', () => ({
  getShipmentFiles: (...args) => getShipmentFiles(...args),
}));

jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: (...args) => getPriceFiles(...args),
}));

const { getUploadFreshness } = await import('../../lib/stats/upload-status.js');

beforeEach(() => {
  jest.clearAllMocks();
  getUploadedFiles.mockResolvedValue([]);
  getShipmentFiles.mockResolvedValue([]);
  getPriceFiles.mockResolvedValue([]);
});

describe('upload status guards', () => {
  test('조회 결과가 비배열이면 never 상태로 안전하게 내려간다', async () => {
    getUploadedFiles.mockResolvedValue('bad');
    getShipmentFiles.mockResolvedValue(null);
    getPriceFiles.mockResolvedValue({ updateDate: '2026-06-01' });

    const result = await getUploadFreshness(new Date('2026-06-09T00:00:00.000Z'));

    expect(result.sales).toEqual({ year: null, month: null, stale: true, never: true });
    expect(result.shipment).toEqual({ year: null, month: null, stale: true, never: true });
    expect(result.price).toEqual({ year: null, month: null, stale: true, never: true });
  });

  test('깨진 최신 판매/출고 연월은 stale 상태로 정규화한다', async () => {
    getUploadedFiles.mockResolvedValue([null, { year: '2026', month: 'bad' }]);
    getShipmentFiles.mockResolvedValue([{ year: 2026, month: 13 }]);
    getPriceFiles.mockResolvedValue([{ updateDate: '2026-05-10T00:00:00.000Z' }]);

    const result = await getUploadFreshness(new Date('2026-06-09T00:00:00.000Z'));

    expect(result.sales).toEqual({ year: null, month: null, stale: true, never: false });
    expect(result.shipment).toEqual({ year: null, month: null, stale: true, never: false });
    expect(result.price).toEqual({ year: 2026, month: 5, stale: false, never: false });
  });
});
