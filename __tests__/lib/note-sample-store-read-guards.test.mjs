import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const initSharedDB = jest.fn(async () => {});
const sharedHasStore = jest.fn(() => true);
const sharedGetAll = jest.fn(async () => []);
const sharedGetById = jest.fn(async () => null);
const sharedGetByIndex = jest.fn(async () => []);
const sharedDeleteById = jest.fn(async () => {});
const sharedRunTransaction = jest.fn(async () => {});
const logWork = jest.fn(async () => {});

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

const noteStore = await import('@/lib/note/store');
const sampleStore = await import('@/lib/sample/store');

describe('노트/샘플 store 읽기 가드', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sharedHasStore.mockReturnValue(true);
    sharedGetAll.mockResolvedValue([]);
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
