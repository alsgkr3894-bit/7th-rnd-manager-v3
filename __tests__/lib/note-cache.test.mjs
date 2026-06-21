import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const records = [];
const initSharedDB = jest.fn(async () => {});
const sharedHasStore = jest.fn(() => true);
const sharedGetAll = jest.fn(async () => [...records]);
const sharedGetById = jest.fn(async (_store, id) => records.find(r => r.id === id) || null);
const sharedGetByIndex = jest.fn(async () => []);
const sharedDeleteById = jest.fn(async () => {});
const sharedRunTransaction = jest.fn(async (_stores, _mode, work) => {
  work({
    objectStore() {
      return {
        add(record) {
          const id = records.length + 1;
          records.push({ ...record, id });
          const req = { result: id, onsuccess: null };
          Promise.resolve().then(() => req.onsuccess?.());
          return req;
        },
        put(record) {
          const i = records.findIndex(r => r.id === record.id);
          if (i >= 0) records[i] = record;
          else records.push(record);
        },
        delete(id) {
          const i = records.findIndex(r => r.id === id);
          if (i >= 0) records.splice(i, 1);
        },
      };
    },
  });
});
let activeBrandId = 'main';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

jest.unstable_mockModule('@/lib/db/shared', () => ({
  initSharedDB,
  sharedHasStore,
  sharedGetAll,
  sharedGetById,
  sharedGetByIndex,
  sharedDeleteById,
  sharedRunTransaction,
}));
jest.unstable_mockModule('@/lib/work-log', () => ({ logWork: jest.fn(async () => {}) }));
jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: jest.fn(() => activeBrandId),
}));

const noteStore = await import('@/lib/note/store');

beforeEach(() => {
  jest.clearAllMocks();
  sharedGetAll.mockReset();
  sharedGetAll.mockImplementation(async () => [...records]);
  records.length = 0;
  activeBrandId = 'main';
  globalThis.localStorage = { removeItem: jest.fn() };
  noteStore.invalidateNotesCache();
});

afterEach(() => {
  if (Date.now.mockRestore) Date.now.mockRestore();
});

describe('노트 목록 캐시 (getAllNotesCached)', () => {
  test('TTL 안에서는 store 스캔을 재사용한다(중복 getAll 없음)', async () => {
    records.push({ id: 1, title: 'A', createdAt: '2026-06-01T00:00:00.000Z' });

    const first = await noteStore.getAllNotesCached();
    const second = await noteStore.getAllNotesCached();

    expect(sharedGetAll).toHaveBeenCalledTimes(1);
    expect(first.map(r => r.id)).toEqual([1]);
    expect(second.map(r => r.id)).toEqual([1]);
  });

  test('동시 호출은 하나의 스캔으로 합쳐진다', async () => {
    records.push({ id: 1, title: 'A', createdAt: '2026-06-01T00:00:00.000Z' });

    await Promise.all([noteStore.getAllNotesCached(), noteStore.getAllNotesCached()]);

    expect(sharedGetAll).toHaveBeenCalledTimes(1);
  });

  test('쓰기(addNote)가 캐시를 즉시 무효화해 다음 조회는 최신을 본다', async () => {
    records.push({ id: 1, title: 'A', createdAt: '2026-06-01T00:00:00.000Z' });
    await noteStore.getAllNotesCached();
    expect(sharedGetAll).toHaveBeenCalledTimes(1);

    await noteStore.addNote({ title: 'B' });
    const after = await noteStore.getAllNotesCached();

    expect(sharedGetAll).toHaveBeenCalledTimes(2); // 무효화로 재스캔
    expect(after.some(r => r.title === 'B')).toBe(true);
  });

  test('deleteNote도 캐시를 무효화한다', async () => {
    records.push({ id: 1, title: 'A', brand: 'main', createdAt: '2026-06-01T00:00:00.000Z' });
    await noteStore.getAllNotesCached();
    expect(sharedGetAll).toHaveBeenCalledTimes(1);

    await noteStore.deleteNote(1);
    await noteStore.getAllNotesCached();

    // delete 경로의 getAll(자식 수집) + 무효화 후 재조회 getAll로 호출이 늘어난다.
    expect(sharedGetAll.mock.calls.length).toBeGreaterThan(1);
  });

  test('TTL이 지나면 다시 스캔한다', async () => {
    let clock = 10_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    records.push({ id: 1, title: 'A', createdAt: '2026-06-01T00:00:00.000Z' });

    await noteStore.getAllNotesCached();
    expect(sharedGetAll).toHaveBeenCalledTimes(1);

    clock += 2000; // 1.5s TTL 초과
    await noteStore.getAllNotesCached();
    expect(sharedGetAll).toHaveBeenCalledTimes(2);
  });

  test('getAllNotes(비캐시)는 매번 새로 스캔한다', async () => {
    records.push({ id: 1, title: 'A', createdAt: '2026-06-01T00:00:00.000Z' });

    await noteStore.getAllNotes();
    await noteStore.getAllNotes();

    expect(sharedGetAll).toHaveBeenCalledTimes(2);
  });

  test('무효화가 in-flight 읽기 중 발생하면 호출자도 최신 세대 읽기를 따른다', async () => {
    const staleRows = [{ id: 1, title: 'A', brand: 'main', createdAt: '2026-06-01T00:00:00.000Z' }];
    const freshRows = [
      ...staleRows,
      { id: 2, title: 'B', brand: 'main', createdAt: '2026-06-02T00:00:00.000Z' },
    ];
    const staleRead = deferred();
    sharedGetAll
      .mockImplementationOnce(() => staleRead.promise)
      .mockImplementationOnce(async () => freshRows);

    const first = noteStore.getAllNotesCached();
    await Promise.resolve();
    expect(sharedGetAll).toHaveBeenCalledTimes(1);
    noteStore.invalidateNotesCache();
    const second = noteStore.getAllNotesCached();
    staleRead.resolve(staleRows);

    await expect(first).resolves.toMatchObject([{ id: 2 }, { id: 1 }]);
    await expect(second).resolves.toMatchObject([{ id: 2 }, { id: 1 }]);
    expect(sharedGetAll).toHaveBeenCalledTimes(2);
  });

  test('브랜드 필터는 raw 캐시가 아닌 호출 시점에 적용한다', async () => {
    records.push(
      { id: 1, title: 'Main', brand: 'main', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 2, title: 'China', brand: 'china4', createdAt: '2026-06-02T00:00:00.000Z' }
    );

    await expect(noteStore.getAllNotesCached()).resolves.toMatchObject([{ id: 1 }]);
    activeBrandId = 'china4';
    await expect(noteStore.getAllNotesCached()).resolves.toMatchObject([{ id: 2 }]);

    expect(sharedGetAll).toHaveBeenCalledTimes(1);
  });
});
