import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();
const getByIndex = jest.fn();
const runTransaction = jest.fn();
const checkUploadHash = jest.fn();
const deleteFileWithLog = jest.fn();
const assertActiveAdmin = jest.fn();

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
  getByIndex: (...args) => getByIndex(...args),
  runTransaction: (...args) => runTransaction(...args),
  checkUploadHash: (...args) => checkUploadHash(...args),
  deleteFileWithLog: (...args) => deleteFileWithLog(...args),
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: (...args) => assertActiveAdmin(...args),
}));

const { deleteShipmentFile, getShipmentFiles, getShipmentRowsByFileId, saveShipmentUpload } =
  await import('../../lib/shipment/store-files.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
  getByIndex.mockResolvedValue([]);
  checkUploadHash.mockResolvedValue(false);
  deleteFileWithLog.mockResolvedValue({ deletedRows: 0, deletedLogs: 0 });
  assertActiveAdmin.mockResolvedValue();
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

  test('saveShipmentUpload는 관리자 가드 실패 시 중복 검사 전에 중단한다', async () => {
    assertActiveAdmin.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    await expect(
      saveShipmentUpload({
        meta: { year: 2026, month: 6 },
        rows: [],
        log: { fileHash: 'hash-1' },
      })
    ).rejects.toThrow('PERMISSION_DENIED');
    expect(assertActiveAdmin).toHaveBeenCalledWith('제때 출고량 업로드 저장');
    expect(checkUploadHash).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test('saveShipmentUpload는 같은 파일 해시 중복을 저장 전에 차단한다', async () => {
    checkUploadHash.mockResolvedValueOnce(true);

    await expect(
      saveShipmentUpload({
        meta: { year: 2026, month: 6 },
        rows: [{ productCode: 'A', quantity: 1 }],
        log: { module: 'shipment', fileHash: 'hash-dup' },
      })
    ).rejects.toThrow('DUPLICATE_HASH');

    expect(assertActiveAdmin).toHaveBeenCalledWith('제때 출고량 업로드 저장');
    expect(checkUploadHash).toHaveBeenCalledWith('hash-dup', 'shipment');
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test('saveShipmentUpload는 저장 트랜잭션 안에서도 같은 파일 해시 중복을 다시 차단한다', async () => {
    checkUploadHash.mockResolvedValueOnce(false);
    runTransaction.mockImplementation(async (storeNames, mode, work) => {
      const requests = [];
      let aborted = false;
      const tx = {
        abort: jest.fn(() => {
          aborted = true;
        }),
        objectStore(storeName) {
          if (storeName === 'upload_log') {
            return {
              index(indexName) {
                expect(indexName).toBe('fileHash');
                return {
                  getAll(fileHash) {
                    const req = {
                      result: [{ module: 'shipment', fileHash }],
                      onsuccess: null,
                    };
                    requests.push(req);
                    return req;
                  },
                };
              },
              add: jest.fn(),
            };
          }
          return {
            add: jest.fn(() => ({ onsuccess: null, onerror: null, result: 1 })),
          };
        },
      };

      work(tx);
      for (const req of requests) req.onsuccess?.();
      if (aborted) throw new Error('transaction aborted');
    });

    await expect(
      saveShipmentUpload({
        meta: { year: 2026, month: 6 },
        rows: [{ productCode: 'A', quantity: 1 }],
        log: { module: 'shipment', fileHash: 'hash-race' },
      })
    ).rejects.toThrow('DUPLICATE_HASH');

    expect(runTransaction).toHaveBeenCalledWith(
      ['shipment_files', 'shipment_rows', 'upload_log'],
      'readwrite',
      expect.any(Function)
    );
  });

  test('deleteShipmentFile은 관리자 가드를 거친 뒤 삭제한다', async () => {
    await deleteShipmentFile(9);

    expect(assertActiveAdmin).toHaveBeenCalledWith('제때 출고량 업로드 삭제');
    expect(deleteFileWithLog).toHaveBeenCalledWith(
      'shipment_files',
      'shipment_rows',
      9,
      'shipment'
    );
  });
});
