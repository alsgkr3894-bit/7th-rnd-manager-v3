import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();
const getByIndex = jest.fn();
const runTransaction = jest.fn();
const checkUploadHash = jest.fn();
const deleteFileWithLog = jest.fn();

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
  getByIndex: (...args) => getByIndex(...args),
  runTransaction: (...args) => runTransaction(...args),
  checkUploadHash: (...args) => checkUploadHash(...args),
  deleteFileWithLog: (...args) => deleteFileWithLog(...args),
}));

const {
  getShipmentFiles,
  getShipmentRowsByFileId,
} = await import('../../lib/shipment/store-files.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
  getByIndex.mockResolvedValue([]);
});

describe('shipment store read guards', () => {
  test('스토어가 없으면 DB 조회 없이 빈 배열을 반환한다', async () => {
    hasStore.mockReturnValue(false);

    await expect(getShipmentFiles()).resolves.toEqual([]);
    await expect(getShipmentRowsByFileId(1)).resolves.toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
    expect(getByIndex).not.toHaveBeenCalled();
  });

  test('출고 파일 목록은 깨진 행을 무시하고 최신 기간순을 유지한다', async () => {
    getAll.mockResolvedValue([
      null,
      'bad',
      { id: 1, year: '2026', month: '5', uploadedAt: '2026-05-03T00:00:00.000Z' },
      { id: 2, year: 2026, month: 6, uploadedAt: '2026-06-01T00:00:00.000Z' },
      { id: 3, year: 2026, month: 5, uploadedAt: '2026-05-05T00:00:00.000Z' },
      ['nested'],
    ]);

    const result = await getShipmentFiles();

    expect(result.map(file => file.id)).toEqual([2, 3, 1]);
  });

  test('fileId가 비어 있으면 shipment_rows 인덱스를 조회하지 않는다', async () => {
    await expect(getShipmentRowsByFileId(null)).resolves.toEqual([]);
    await expect(getShipmentRowsByFileId(undefined)).resolves.toEqual([]);
    expect(getByIndex).not.toHaveBeenCalled();
  });

  test('출고 행 조회 결과는 객체 배열로 정규화한다', async () => {
    getByIndex.mockResolvedValue([
      null,
      'bad',
      { productCode: 'A', quantity: 2 },
      ['nested'],
      { productCode: 'B', quantity: '3' },
    ]);

    await expect(getShipmentRowsByFileId(7)).resolves.toEqual([
      { productCode: 'A', quantity: 2 },
      { productCode: 'B', quantity: '3' },
    ]);
    expect(getByIndex).toHaveBeenCalledWith('shipment_rows', 'fileId', 7);
  });
});
