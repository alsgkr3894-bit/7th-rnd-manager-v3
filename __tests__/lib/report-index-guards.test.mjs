import { describe, expect, jest, test, beforeEach } from '@jest/globals';

let dbRows = [];
const initDB = jest.fn(async () => {});
const getAll = jest.fn(async () => dbRows);
const put = jest.fn(async (_storeName, record) => record);
const deleteById = jest.fn(async id => id);

jest.unstable_mockModule('@/lib/db/init', () => ({ initDB }));
jest.unstable_mockModule('@/lib/db/operations', () => ({ getAll, put, deleteById }));
jest.unstable_mockModule('@/lib/profile', () => ({ getProfile: () => ({ name: '테스터' }) }));
jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn(async () => {}),
}));

const { assertActiveAdmin } = await import('@/lib/auth/guard');
const { getReports, saveReport, toggleReportFav, deleteReport, pruneOldReports } =
  await import('../../lib/report/index.js');

describe('report index guards', () => {
  beforeEach(() => {
    dbRows = [];
    initDB.mockClear();
    getAll.mockClear();
    put.mockClear();
    deleteById.mockClear();
    assertActiveAdmin.mockClear();
  });

  test('getReports는 배열이 아닌 DB 응답을 빈 목록으로 처리한다', async () => {
    dbRows = null;

    await expect(getReports()).resolves.toEqual([]);
  });

  test('getReports는 생성일 내림차순으로 정렬한다', async () => {
    dbRows = [
      { id: 1, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 2, createdAt: '2026-02-01T00:00:00.000Z' },
    ];

    await expect(getReports()).resolves.toEqual([
      { id: 2, createdAt: '2026-02-01T00:00:00.000Z' },
      { id: 1, createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  test('saveReport는 null 입력에도 기본 메타를 채워 저장한다', async () => {
    const record = await saveReport(null);

    expect(assertActiveAdmin).toHaveBeenCalledWith('보고서 저장');
    expect(record).toMatchObject({
      fav: false,
      views: 0,
      links: 0,
      author: '테스터',
      pages: 1,
      options: {},
    });
    expect(record.createdAt).toEqual(expect.any(String));
    expect(put).toHaveBeenCalledWith('generated_reports', record);
  });

  test('toggleReportFav는 관리자 가드를 거친 뒤 즐겨찾기를 바꾼다', async () => {
    dbRows = [{ id: 3, fav: false, name: '보고서' }];

    await toggleReportFav(3, false);

    expect(assertActiveAdmin).toHaveBeenCalledWith('보고서 즐겨찾기 변경');
    expect(put).toHaveBeenCalledWith('generated_reports', {
      id: 3,
      fav: true,
      name: '보고서',
    });
  });

  test('pruneOldReports는 잘못된 보관일 입력을 기본값으로 처리한다', async () => {
    dbRows = [
      { id: 1, createdAt: '1900-01-01T00:00:00.000Z' },
      { id: 2, createdAt: '2999-01-01T00:00:00.000Z' },
    ];

    await pruneOldReports('bad');

    expect(assertActiveAdmin).toHaveBeenCalledWith('오래된 보고서 정리');
    expect(deleteById).toHaveBeenCalledTimes(1);
    expect(deleteById).toHaveBeenCalledWith('generated_reports', 1);
  });

  test('deleteReport는 관리자 가드를 거친 뒤 보고서를 삭제한다', async () => {
    await deleteReport(7);

    expect(assertActiveAdmin).toHaveBeenCalledWith('보고서 삭제');
    expect(deleteById).toHaveBeenCalledWith('generated_reports', 7);
  });
});
