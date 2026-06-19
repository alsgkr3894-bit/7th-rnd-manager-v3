/**
 * 식자재 정리 도구 단위 테스트.
 * renameCategoryInAll / renameTagInAll / bulkSetDiscontinued / bulkSetCategory
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let ingredientRows = [];
let nextId = 1;

function upsertRow(record) {
  const row = { ...record };
  if (row.id == null) row.id = nextId++;
  const idx = ingredientRows.findIndex(r => r.id === row.id);
  if (idx >= 0) ingredientRows[idx] = row;
  else ingredientRows.push(row);
}

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(() => true),
  getAll: jest.fn(storeName => {
    if (storeName === 'cost_ingredients') return Promise.resolve([...ingredientRows]);
    return Promise.resolve([]);
  }),
  runTransaction: jest.fn((_storeNames, _mode, work) => {
    const tx = {
      objectStore(storeName) {
        if (storeName !== 'cost_ingredients') throw new Error(`unexpected store: ${storeName}`);
        return {
          put(record) {
            upsertRow(record);
          },
          delete(id) {
            ingredientRows = ingredientRows.filter(r => r.id !== id);
          },
        };
      },
    };
    work(tx);
    return Promise.resolve();
  }),
}));

jest.unstable_mockModule('@/lib/work-log', () => ({
  logWork: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: () => 'main',
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn().mockResolvedValue(undefined),
}));

const { renameCategoryInAll, renameTagInAll, bulkSetDiscontinued, bulkSetCategory } =
  await import('../../lib/ingredient/store.js');

beforeEach(() => {
  ingredientRows = [];
  nextId = 1;
  jest.clearAllMocks();
});

// ── renameCategoryInAll ──────────────────────────────────────────────────────

describe('renameCategoryInAll', () => {
  test('해당 분류를 가진 모든 행의 category를 바꾼다', async () => {
    ingredientRows = [
      { id: 1, category: '토핑재료', ingredientName: 'A' },
      { id: 2, category: '토핑재료', ingredientName: 'B' },
      { id: 3, category: '소스류', ingredientName: 'C' },
    ];

    const result = await renameCategoryInAll('토핑재료', '신토핑');
    expect(result).toEqual({ updated: 2 });
    expect(ingredientRows.filter(r => r.category === '신토핑')).toHaveLength(2);
    expect(ingredientRows.find(r => r.id === 3).category).toBe('소스류');
  });

  test('일치하는 행이 없으면 updated:0 반환', async () => {
    ingredientRows = [{ id: 1, category: '소스류', ingredientName: 'X' }];
    const result = await renameCategoryInAll('없는분류', '새이름');
    expect(result).toEqual({ updated: 0 });
  });

  test('새 이름이 공백이면 변경하지 않는다', async () => {
    ingredientRows = [{ id: 1, category: '소스류', ingredientName: 'X' }];
    const result = await renameCategoryInAll('소스류', '   ');
    expect(result).toEqual({ updated: 0 });
    expect(ingredientRows[0].category).toBe('소스류');
  });

  test('이름이 같으면 변경하지 않는다', async () => {
    ingredientRows = [{ id: 1, category: '소스류', ingredientName: 'X' }];
    const result = await renameCategoryInAll('소스류', '소스류');
    expect(result).toEqual({ updated: 0 });
  });

  test('assertActiveAdmin을 호출한다', async () => {
    const { assertActiveAdmin } = await import('@/lib/auth/guard');
    await renameCategoryInAll('토핑재료', '신토핑');
    expect(assertActiveAdmin).toHaveBeenCalledWith('분류 이름 변경');
  });
});

// ── renameTagInAll ───────────────────────────────────────────────────────────

describe('renameTagInAll', () => {
  test('해당 태그를 포함한 모든 행의 해당 태그를 바꾼다', async () => {
    ingredientRows = [
      { id: 1, tags: ['냉동', '주재료'], ingredientName: 'A' },
      { id: 2, tags: ['냉동'], ingredientName: 'B' },
      { id: 3, tags: ['상온'], ingredientName: 'C' },
    ];

    const result = await renameTagInAll('냉동', '냉동품');
    expect(result).toEqual({ updated: 2 });
    expect(ingredientRows.find(r => r.id === 1).tags).toContain('냉동품');
    expect(ingredientRows.find(r => r.id === 1).tags).not.toContain('냉동');
    expect(ingredientRows.find(r => r.id === 2).tags).toEqual(['냉동품']);
    expect(ingredientRows.find(r => r.id === 3).tags).toEqual(['상온']);
  });

  test('다른 태그는 손대지 않는다', async () => {
    ingredientRows = [{ id: 1, tags: ['냉동', '주재료'], ingredientName: 'A' }];
    await renameTagInAll('냉동', '냉동품');
    expect(ingredientRows[0].tags).toContain('주재료');
  });

  test('tags가 없는 행은 건너뛴다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await renameTagInAll('냉동', '냉동품');
    expect(result).toEqual({ updated: 0 });
  });

  test('이미 새 이름 태그가 있으면 중복 제거한다', async () => {
    // ['냉동', '냉동품'] → 냉동을 냉동품으로 바꾸면 중복 → ['냉동품']
    ingredientRows = [{ id: 1, tags: ['냉동', '냉동품'], ingredientName: 'A' }];
    const result = await renameTagInAll('냉동', '냉동품');
    expect(result).toEqual({ updated: 1 });
    expect(ingredientRows[0].tags).toEqual(['냉동품']);
  });

  test('assertActiveAdmin을 호출한다', async () => {
    const { assertActiveAdmin } = await import('@/lib/auth/guard');
    await renameTagInAll('냉동', '냉동품');
    expect(assertActiveAdmin).toHaveBeenCalledWith('태그 이름 변경');
  });
});

// ── bulkSetDiscontinued ──────────────────────────────────────────────────────

describe('bulkSetDiscontinued', () => {
  test('지정한 id 목록의 discontinued를 true로 설정한다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A', discontinued: false },
      { id: 2, ingredientName: 'B', discontinued: false },
      { id: 3, ingredientName: 'C', discontinued: false },
    ];

    const result = await bulkSetDiscontinued([1, 3], true);
    expect(result).toEqual({ updated: 2 });
    expect(ingredientRows.find(r => r.id === 1).discontinued).toBe(true);
    expect(ingredientRows.find(r => r.id === 2).discontinued).toBe(false);
    expect(ingredientRows.find(r => r.id === 3).discontinued).toBe(true);
  });

  test('discontinued를 false(복구)로 설정한다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A', discontinued: true },
      { id: 2, ingredientName: 'B', discontinued: true },
    ];

    const result = await bulkSetDiscontinued([1], false);
    expect(result).toEqual({ updated: 1 });
    expect(ingredientRows.find(r => r.id === 1).discontinued).toBe(false);
    expect(ingredientRows.find(r => r.id === 2).discontinued).toBe(true);
  });

  test('ids가 빈 배열이면 updated:0 반환', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await bulkSetDiscontinued([], true);
    expect(result).toEqual({ updated: 0 });
  });

  test('존재하지 않는 id는 건너뛴다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await bulkSetDiscontinued([999], true);
    expect(result).toEqual({ updated: 0 });
  });

  test('assertActiveAdmin을 호출한다', async () => {
    const { assertActiveAdmin } = await import('@/lib/auth/guard');
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    await bulkSetDiscontinued([1], true);
    expect(assertActiveAdmin).toHaveBeenCalledWith('식자재 일괄 단종 변경');
  });
});

// ── bulkSetCategory ──────────────────────────────────────────────────────────

describe('bulkSetCategory', () => {
  test('지정한 id 목록의 category를 새 분류로 바꾼다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A', category: '소스류' },
      { id: 2, ingredientName: 'B', category: '토핑재료' },
      { id: 3, ingredientName: 'C', category: '토핑재료' },
    ];

    const result = await bulkSetCategory([1, 2], '치즈류');
    expect(result).toEqual({ updated: 2 });
    expect(ingredientRows.find(r => r.id === 1).category).toBe('치즈류');
    expect(ingredientRows.find(r => r.id === 2).category).toBe('치즈류');
    expect(ingredientRows.find(r => r.id === 3).category).toBe('토핑재료');
  });

  test('빈 문자열로 분류를 제거한다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A', category: '소스류' }];
    const result = await bulkSetCategory([1], '');
    expect(result).toEqual({ updated: 1 });
    expect(ingredientRows[0].category).toBe('');
  });

  test('ids가 빈 배열이면 updated:0 반환', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await bulkSetCategory([], '소스류');
    expect(result).toEqual({ updated: 0 });
  });

  test('assertActiveAdmin을 호출한다', async () => {
    const { assertActiveAdmin } = await import('@/lib/auth/guard');
    ingredientRows = [{ id: 1, ingredientName: 'A', category: '' }];
    await bulkSetCategory([1], '소스류');
    expect(assertActiveAdmin).toHaveBeenCalledWith('식자재 일괄 분류 변경');
  });
});
