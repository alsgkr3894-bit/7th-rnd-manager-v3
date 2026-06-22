import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const records = {
  note_schedules: [],
  work_log: [],
};

const getActiveBrandId = jest.fn(() => 'main');
const initSharedDB = jest.fn(async () => {});
const sharedHasStore = jest.fn(store => Object.prototype.hasOwnProperty.call(records, store));
const sharedGetAll = jest.fn(async store => [...(records[store] || [])]);
const sharedDeleteById = jest.fn(async (store, id) => {
  records[store] = (records[store] || []).filter(row => row.id !== id);
});
const sharedRunTransaction = jest.fn(async (_stores, _mode, work) => {
  work({
    objectStore(store) {
      return {
        add(row) {
          const id = records[store].length + 1;
          records[store].push({ ...row, id });
          const req = { result: id, onsuccess: null };
          Promise.resolve().then(() => req.onsuccess?.());
          return req;
        },
        put(row) {
          const index = records[store].findIndex(item => item.id === row.id);
          if (index >= 0) records[store][index] = row;
          else records[store].push(row);
        },
        delete(id) {
          records[store] = records[store].filter(row => row.id !== id);
        },
      };
    },
  });
});

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId,
}));

jest.unstable_mockModule('@/lib/db/shared', () => ({
  initSharedDB,
  sharedHasStore,
  sharedGetAll,
  sharedDeleteById,
  sharedRunTransaction,
}));
jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn(async () => {}),
}));

const schedules = await import('@/lib/note/schedules');
const workLog = await import('@/lib/work-log');

describe('공유 노트 패밀리 store 브랜드 스코프', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveBrandId.mockReturnValue('main');
    records.note_schedules = [
      { id: 1, title: 'main legacy', date: '2026-06-15' },
      { id: 2, brand: 'brand-b', title: 'brand b', date: '2026-06-15' },
    ];
    records.work_log = [
      { id: 1, date: '2026-06-15', at: '2026-06-15T00:00:00.000Z', type: 'OTHER', summary: 'main' },
      {
        id: 2,
        brand: 'brand-b',
        date: '2026-06-15',
        at: '2026-06-15T01:00:00.000Z',
        type: 'OTHER',
        summary: 'brand b',
      },
    ];
  });

  test('일정과 작업일지 조회는 현재 브랜드 범위만 반환한다', async () => {
    getActiveBrandId.mockReturnValue('brand-b');

    await expect(schedules.getAllSchedules()).resolves.toMatchObject([{ id: 2 }]);
    await expect(workLog.getWorkLogByDate('2026-06-15')).resolves.toMatchObject([{ id: 2 }]);
    await expect(workLog.getAllWorkLogs()).resolves.toMatchObject([{ id: 2 }]);
  });

  test('일정과 작업일지 신규 저장에는 현재 브랜드를 기록한다', async () => {
    getActiveBrandId.mockReturnValue('brand-b');

    await schedules.addSchedule({ title: '신규 일정', date: '2026-06-16' });
    await workLog.logWork('OTHER', '신규 작업');

    expect(records.note_schedules.at(-1)).toMatchObject({ brand: 'brand-b', title: '신규 일정' });
    expect(records.work_log.at(-1)).toMatchObject({ brand: 'brand-b', summary: '신규 작업' });
  });

  test('다른 브랜드 일정은 수정/삭제하지 않는다', async () => {
    getActiveBrandId.mockReturnValue('brand-b');

    await expect(
      schedules.updateSchedule(1, { title: '수정 시도', date: '2026-06-15' })
    ).rejects.toThrow('일정을 찾을 수 없습니다');
    await expect(schedules.deleteSchedule(1)).rejects.toThrow('일정을 찾을 수 없습니다');
  });
});
