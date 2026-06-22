import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const initSharedDB = jest.fn(async () => {});
const sharedHasStore = jest.fn(() => true);
const sharedGetAll = jest.fn(async () => []);
const sharedGetById = jest.fn(async () => null);
const sharedGetByIndex = jest.fn(async () => []);
const sharedDeleteById = jest.fn(async () => {});
const txDeletes = [];
const sharedRunTransaction = jest.fn(async (_stores, _mode, work) => {
  work({
    objectStore() {
      return {
        add(record) {
          const req = { result: record?.id ?? 1, onsuccess: null };
          Promise.resolve().then(() => req.onsuccess?.());
          return req;
        },
        put() {},
        delete(id) {
          txDeletes.push(id);
        },
      };
    },
  });
});
const logWork = jest.fn(async () => {});
const getActiveBrandId = jest.fn(() => 'main');

jest.unstable_mockModule('@/lib/db/shared', () => ({
  initSharedDB,
  sharedHasStore,
  sharedGetAll,
  sharedGetById,
  sharedGetByIndex,
  sharedDeleteById,
  sharedRunTransaction,
}));

jest.unstable_mockModule('@/lib/work-log', () => ({
  logWork,
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId,
}));
jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn(async () => {}),
}));

const noteStore = await import('@/lib/note/store');
const sampleStore = await import('@/lib/sample/store');

describe('노트/샘플 store 읽기 가드', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    txDeletes.length = 0;
    getActiveBrandId.mockReturnValue('main');
    sharedHasStore.mockReturnValue(true);
    sharedGetAll.mockResolvedValue([]);
    sharedGetById.mockResolvedValue(null);
    globalThis.localStorage = { removeItem: jest.fn() };
  });

  test('노트 목록은 객체 행만 보존하고 안전한 createdAt 내림차순으로 정렬한다', async () => {
    sharedGetAll.mockResolvedValueOnce([
      null,
      'bad row',
      ['bad row'],
      { id: 'old', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'bad-date', createdAt: { value: '2026-12-01' } },
      { id: 'new', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 'timestamp', createdAt: 200 },
      { id: 'date-object', createdAt: new Date('2026-03-01T00:00:00.000Z') },
    ]);

    const rows = await noteStore.getAllNotes();

    expect(rows.map(row => row.id)).toEqual(['new', 'date-object', 'old', 'timestamp', 'bad-date']);
  });

  test('노트 체인 조회는 깨진 행을 제외하고 자식 createdAt 오름차순을 유지한다', async () => {
    sharedGetAll.mockResolvedValueOnce([
      { id: 1, title: '루트', parentId: null, createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 3, title: '정상 자식', parentId: 1, createdAt: '2026-06-02T00:00:00.000Z' },
      null,
      'bad row',
      { id: 2, title: '날짜 없음 자식', parentId: 1, createdAt: { bad: true } },
    ]);

    const rows = await noteStore.getNotesInChain(1);

    expect(rows.map(row => row.id)).toEqual([1, 2, 3]);
  });

  test('노트 체인 조회는 현재 브랜드 노트만 반환한다', async () => {
    getActiveBrandId.mockReturnValue('brand-b');
    sharedGetAll.mockResolvedValueOnce([
      { id: 1, title: '다른 브랜드 루트', parentId: null, brand: 'brand-a' },
      { id: 2, title: '다른 브랜드 자식', parentId: 1, brand: 'brand-a' },
      { id: 3, title: '현재 브랜드 루트', parentId: null, brand: 'brand-b' },
      { id: 4, title: '현재 브랜드 자식', parentId: 3, brand: 'brand-b' },
    ]);

    await expect(noteStore.getNotesInChain(1)).resolves.toEqual([]);

    sharedGetAll.mockResolvedValueOnce([
      { id: 1, title: '다른 브랜드 루트', parentId: null, brand: 'brand-a' },
      { id: 2, title: '다른 브랜드 자식', parentId: 1, brand: 'brand-a' },
      { id: 3, title: '현재 브랜드 루트', parentId: null, brand: 'brand-b' },
      { id: 4, title: '현재 브랜드 자식', parentId: 3, brand: 'brand-b' },
    ]);

    await expect(noteStore.getNotesInChain(3)).resolves.toMatchObject([{ id: 3 }, { id: 4 }]);
  });

  test('샘플 목록은 객체 행만 보존하고 안전한 createdAt 내림차순으로 정렬한다', async () => {
    sharedGetAll.mockResolvedValueOnce([
      undefined,
      'bad row',
      { id: 'old', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'bad-date', createdAt: { value: '2026-12-01' } },
      { id: 'new', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 'timestamp', createdAt: 200 },
    ]);

    const rows = await sampleStore.getAllSamples();

    expect(rows.map(row => row.id)).toEqual(['new', 'old', 'timestamp', 'bad-date']);
  });

  test('노트와 샘플 목록은 현재 브랜드 데이터만 반환하고 빈 brand는 main으로 취급한다', async () => {
    getActiveBrandId.mockReturnValue('brand-b');
    sharedGetAll.mockResolvedValueOnce([
      { id: 'main-empty', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 'brand-a', brand: 'brand-a', createdAt: '2026-06-02T00:00:00.000Z' },
      { id: 'brand-b', brand: 'brand-b', createdAt: '2026-06-03T00:00:00.000Z' },
    ]);

    await expect(noteStore.getAllNotes()).resolves.toMatchObject([{ id: 'brand-b' }]);

    sharedGetAll.mockResolvedValueOnce([
      { id: 'main-empty', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 'brand-b', brand: 'brand-b', createdAt: '2026-06-03T00:00:00.000Z' },
    ]);

    await expect(sampleStore.getAllSamples()).resolves.toMatchObject([{ id: 'brand-b' }]);

    getActiveBrandId.mockReturnValue('main');
    sharedGetAll.mockResolvedValueOnce([
      { id: 'main-empty', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 'brand-b', brand: 'brand-b', createdAt: '2026-06-03T00:00:00.000Z' },
    ]);

    await expect(noteStore.getAllNotes()).resolves.toMatchObject([{ id: 'main-empty' }]);
  });

  test('브랜드가 다른 노트와 샘플은 id 직접 조회에서도 숨긴다', async () => {
    getActiveBrandId.mockReturnValue('brand-b');
    sharedGetById.mockResolvedValueOnce({ id: 1, brand: 'brand-a' });
    await expect(noteStore.getNoteById(1)).resolves.toBeNull();

    sharedGetById.mockResolvedValueOnce({ id: 2, brand: 'brand-b' });
    await expect(sampleStore.getSampleById(2)).resolves.toMatchObject({ id: 2 });
  });

  test('노트 삭제는 parentId 하위 체인 전체를 같은 트랜잭션에서 삭제한다', async () => {
    sharedGetById.mockResolvedValueOnce({ id: 1, title: '루트', brand: 'main' });
    sharedGetAll.mockResolvedValueOnce([
      { id: 1, title: '루트', brand: 'main' },
      { id: 2, title: '자식', parentId: 1, brand: 'main' },
      { id: 3, title: '손자', parentId: 2, brand: 'main' },
      { id: 4, title: '다른 브랜드 자식', parentId: 1, brand: 'brand-b' },
    ]);

    const deleted = await noteStore.deleteNote(1);

    expect(deleted.map(row => row.id)).toEqual([1, 2, 3]);
    expect(txDeletes).toEqual([1, 2, 3]);
    expect(globalThis.localStorage.removeItem).toHaveBeenCalledTimes(3);
  });

  test('목록 조회 응답이 배열이 아니면 빈 목록으로 처리한다', async () => {
    sharedGetAll.mockResolvedValueOnce({ id: 1, createdAt: '2026-06-01T00:00:00.000Z' });
    await expect(noteStore.getAllNotes()).resolves.toEqual([]);

    sharedGetAll.mockResolvedValueOnce('bad response');
    await expect(sampleStore.getAllSamples()).resolves.toEqual([]);
  });

  test('store가 없으면 조회를 시도하지 않고 빈 목록으로 처리한다', async () => {
    sharedHasStore.mockReturnValue(false);

    await expect(noteStore.getAllNotes()).resolves.toEqual([]);
    await expect(sampleStore.getAllSamples()).resolves.toEqual([]);
    expect(sharedGetAll).not.toHaveBeenCalled();
  });

  test('샘플명 표시는 깨진 배열 항목과 구버전 menuName을 안전하게 정규화한다', () => {
    expect(
      sampleStore.sampleNamesOf({
        sampleNames: [' 콤비 ', null, 7, { name: 'bad' }, ''],
        menuName: 'fallback',
      })
    ).toEqual(['콤비', '7']);

    expect(
      sampleStore.sampleNamesOf({
        sampleNames: [{ name: 'bad' }],
        menuName: ' 구버전 메뉴 ',
      })
    ).toEqual(['구버전 메뉴']);

    expect(
      sampleStore.sampleNamesText({
        sampleNames: [' A ', 3, undefined, 'B'],
      })
    ).toBe('A, 3, B');
  });
});
