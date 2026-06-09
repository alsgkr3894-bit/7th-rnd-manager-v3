import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getPriceFiles = jest.fn();
const getPriceRowsByFileId = jest.fn();
const comparePriceLists = jest.fn();
const buildLatestPriceLookup = jest.fn();
const getShipmentFiles = jest.fn();
const getShipmentRowsByFileId = jest.fn();
const getManagedProducts = jest.fn();
const aggregateShipmentRows = jest.fn();

jest.unstable_mockModule('../../lib/price/index.js', () => ({
  getPriceFiles: (...args) => getPriceFiles(...args),
  getPriceRowsByFileId: (...args) => getPriceRowsByFileId(...args),
  comparePriceLists: (...args) => comparePriceLists(...args),
}));

jest.unstable_mockModule('../../lib/price/price-lookup.js', () => ({
  buildLatestPriceLookup: (...args) => buildLatestPriceLookup(...args),
}));

jest.unstable_mockModule('../../lib/shipment/index.js', () => ({
  getShipmentFiles: (...args) => getShipmentFiles(...args),
  getShipmentRowsByFileId: (...args) => getShipmentRowsByFileId(...args),
  getManagedProducts: (...args) => getManagedProducts(...args),
  aggregateShipmentRows: (...args) => aggregateShipmentRows(...args),
}));

const { getJetteDashboard } = await import('../../lib/jette/dashboard.js');

beforeEach(() => {
  jest.clearAllMocks();
  getPriceFiles.mockResolvedValue([]);
  getPriceRowsByFileId.mockResolvedValue([]);
  comparePriceLists.mockReturnValue([]);
  buildLatestPriceLookup.mockResolvedValue(new Map());
  getShipmentFiles.mockResolvedValue([]);
  getShipmentRowsByFileId.mockResolvedValue([]);
  getManagedProducts.mockResolvedValue([]);
  aggregateShipmentRows.mockReturnValue([]);
});

describe('jette dashboard guards', () => {
  test('가격 조회 결과가 깨져도 가격 요약은 null로 안전하게 내려간다', async () => {
    getPriceFiles.mockResolvedValue('bad');

    const result = await getJetteDashboard();

    expect(result.price).toBeNull();
    expect(result.shipment).toBeNull();
  });

  test('가격 요약은 diff rows와 최신 파일 값을 안전하게 정규화한다', async () => {
    getPriceFiles.mockResolvedValue([
      { id: 2, updateDate: 123, totalRows: '7' },
      { id: 1, updateDate: '2026-05-01', totalRows: 5 },
    ]);
    getPriceRowsByFileId.mockResolvedValue([]);
    comparePriceLists.mockReturnValue([
      null,
      { changeStatus: '인상' },
      { changeStatus: '인하' },
      { changeStatus: '신규' },
      { changeStatus: '변동없음' },
    ]);

    const result = await getJetteDashboard();

    expect(result.price).toEqual({
      latestDate: '123',
      totalRows: 7,
      upCount: 1,
      downCount: 1,
      newCount: 1,
    });
  });

  test('출고 요약은 깨진 파일과 행을 무시하고 합계를 유지한다', async () => {
    getShipmentFiles.mockResolvedValue([
      { id: 3, year: '2026', month: '5', totalRows: '2' },
      null,
      { id: 4, year: 2026, month: 5, totalRows: 'bad' },
      { id: 5, year: 2026, month: 4, totalRows: 99 },
    ]);
    getShipmentRowsByFileId
      .mockResolvedValueOnce([{ productCode: 'A' }, null])
      .mockResolvedValueOnce('bad');
    getManagedProducts.mockResolvedValue([null, { productCode: 'A' }]);
    buildLatestPriceLookup.mockResolvedValue('bad');
    aggregateShipmentRows.mockReturnValue([
      null,
      { productType: 'exclusive', totalAmount: '1000' },
      { productType: 'generic', totalAmount: 'bad' },
      { productType: 'generic-managed', totalAmount: 500 },
      { productType: 'unknown', totalAmount: 200 },
    ]);

    const result = await getJetteDashboard();

    expect(result.shipment).toEqual({
      year: 2026,
      month: 5,
      rowCount: 2,
      managedCount: 1,
      totalAmount: 1700,
      typeCounts: { exclusive: 1, generic: 1, 'generic-managed': 1 },
    });
    expect(aggregateShipmentRows).toHaveBeenCalledWith(
      [{ productCode: 'A' }],
      [{ productCode: 'A' }],
      null
    );
  });

  test('최신 출고 파일의 기간이 잘못되면 출고 요약은 null이다', async () => {
    getShipmentFiles.mockResolvedValue([{ id: 1, year: 2026, month: 13 }]);

    const result = await getJetteDashboard();

    expect(result.shipment).toBeNull();
  });
});
