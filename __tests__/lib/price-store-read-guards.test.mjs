import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();
const getByIndex = jest.fn();
const runTransaction = jest.fn();
const deleteFileWithLog = jest.fn();
const emitPriceUpload = jest.fn();
const assertActiveAdmin = jest.fn();

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
  getByIndex: (...args) => getByIndex(...args),
  runTransaction: (...args) => runTransaction(...args),
  deleteFileWithLog: (...args) => deleteFileWithLog(...args),
}));

jest.unstable_mockModule('../../lib/price/price-events.js', () => ({
  emitPriceUpload: (...args) => emitPriceUpload(...args),
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: (...args) => assertActiveAdmin(...args),
}));

const { deletePriceFile, getPriceFiles, getPriceRowsByFileId, savePriceUpload } =
  await import('../../lib/price/store.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
  getByIndex.mockResolvedValue([]);
  deleteFileWithLog.mockResolvedValue({ deletedRows: 0, deletedLogs: 0 });
  assertActiveAdmin.mockResolvedValue();
});

describe('price store read guards', () => {
  test('스토어가 없으면 DB 조회 없이 빈 배열을 반환한다', async () => {
    hasStore.mockReturnValue(false);

    await expect(getPriceFiles()).resolves.toEqual([]);
    await expect(getPriceRowsByFileId(1)).resolves.toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
    expect(getByIndex).not.toHaveBeenCalled();
  });

  test('가격 파일 목록은 깨진 행을 무시하고 업데이트일 내림차순을 유지한다', async () => {
    getAll.mockResolvedValue([
      null,
      'bad',
      { id: 1, updateDate: '2026-06-01' },
      { id: 2, updateDate: '2026-06-03' },
      ['nested'],
      { id: 3 },
    ]);

    const result = await getPriceFiles();

    expect(result).toEqual([
      { id: 2, updateDate: '2026-06-03' },
      { id: 1, updateDate: '2026-06-01' },
      { id: 3 },
    ]);
  });

  test('fileId가 비어 있으면 price_rows 인덱스를 조회하지 않는다', async () => {
    await expect(getPriceRowsByFileId(null)).resolves.toEqual([]);
    await expect(getPriceRowsByFileId(undefined)).resolves.toEqual([]);
    expect(getByIndex).not.toHaveBeenCalled();
  });

  test('가격 행 조회 결과는 객체 배열로 정규화한다', async () => {
    getByIndex.mockResolvedValue([
      null,
      'bad',
      { productCode: 'A', priceWithTax: 1200 },
      ['nested'],
      { productCode: 'B', priceWithTax: '3000' },
    ]);

    await expect(getPriceRowsByFileId(7)).resolves.toEqual([
      { productCode: 'A', priceWithTax: 1200 },
      { productCode: 'B', priceWithTax: '3000' },
    ]);
    expect(getByIndex).toHaveBeenCalledWith('price_rows', 'fileId', 7);
  });

  test('savePriceUpload는 관리자 가드 실패 시 DB 조회 전에 중단한다', async () => {
    assertActiveAdmin.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    await expect(
      savePriceUpload({
        meta: { updateDate: '2026-06-01' },
        rows: [],
        log: {},
      })
    ).rejects.toThrow('PERMISSION_DENIED');
    expect(assertActiveAdmin).toHaveBeenCalledWith('제때 단가 업로드 저장');
    expect(getAll).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test('deletePriceFile은 관리자 가드를 거친 뒤 삭제한다', async () => {
    await deletePriceFile(9);

    expect(assertActiveAdmin).toHaveBeenCalledWith('제때 단가 업로드 삭제');
    expect(deleteFileWithLog).toHaveBeenCalledWith('price_files', 'price_rows', 9, 'price');
    expect(emitPriceUpload).toHaveBeenCalledTimes(1);
  });
});
