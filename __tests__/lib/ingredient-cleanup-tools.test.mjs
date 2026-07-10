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

// @/lib/auth/guard must be imported FIRST so the mock instance is established before
// store.js loads destructive.js (which also imports @/lib/auth/guard).
const { assertActiveAdmin } = await import('@/lib/auth/guard');
const {
  renameCategoryInAll,
  renameTagInAll,
  bulkSetDiscontinued,
  bulkSetCategory,
  bulkSetOriginAllergenNone,
  removeManyTagsFromAll,
} = await import('../../lib/ingredient/store.js');
const { computeIngredientIssues } = await import('../../lib/ingredient/index.js');

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
    ingredientRows = [{ id: 1, ingredientName: 'A', category: '' }];
    await bulkSetCategory([1], '소스류');
    expect(assertActiveAdmin).toHaveBeenCalledWith('식자재 일괄 분류 변경');
  });
});

// ── bulkSetOriginAllergenNone ─────────────────────────────────────────────────

describe('bulkSetOriginAllergenNone', () => {
  test('선택한 id 목록에 원산지 없음을 일괄 적용한다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A', originNone: false },
      { id: 2, ingredientName: 'B', originNone: false },
      { id: 3, ingredientName: 'C', originNone: false },
    ];

    const result = await bulkSetOriginAllergenNone([1, 2], { originNone: true });
    expect(result).toEqual({ updated: 2 });
    expect(ingredientRows.find(r => r.id === 1).originNone).toBe(true);
    expect(ingredientRows.find(r => r.id === 2).originNone).toBe(true);
    expect(ingredientRows.find(r => r.id === 3).originNone).toBe(false);
  });

  test('알레르기 없음을 일괄 적용해도 원산지 필드는 건드리지 않는다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A', originNone: true, allergenNone: false },
    ];

    const result = await bulkSetOriginAllergenNone([1], { allergenNone: true });
    expect(result).toEqual({ updated: 1 });
    expect(ingredientRows[0].allergenNone).toBe(true);
    expect(ingredientRows[0].originNone).toBe(true);
  });

  test('두 플래그를 동시에 적용할 수 있다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A', originNone: false, allergenNone: false }];

    await bulkSetOriginAllergenNone([1], { originNone: true, allergenNone: true });
    expect(ingredientRows[0].originNone).toBe(true);
    expect(ingredientRows[0].allergenNone).toBe(true);
  });

  test('다른 필드(카테고리·태그 등)는 그대로 보존한다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A', category: '소스류', tags: ['냉동'], originNone: false },
    ];

    await bulkSetOriginAllergenNone([1], { originNone: true });
    expect(ingredientRows[0].category).toBe('소스류');
    expect(ingredientRows[0].tags).toEqual(['냉동']);
  });

  test('ids가 빈 배열이면 updated:0 반환', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await bulkSetOriginAllergenNone([], { originNone: true });
    expect(result).toEqual({ updated: 0 });
  });

  test('플래그가 없으면 updated:0 반환(아무 필드도 건드리지 않음)', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A', originNone: false }];
    const result = await bulkSetOriginAllergenNone([1], {});
    expect(result).toEqual({ updated: 0 });
    expect(ingredientRows[0].originNone).toBe(false);
  });

  test('assertActiveAdmin을 호출한다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    await bulkSetOriginAllergenNone([1], { originNone: true });
    expect(assertActiveAdmin).toHaveBeenCalledWith('원산지/알레르기 없음 일괄 적용');
  });

  test('일괄 적용 후 computeIngredientIssues에서 원산지/알레르기 미표기 이슈가 사라진다', async () => {
    const rows = [
      {
        id: 1,
        productCode: 'PC-001',
        ingredientName: '치즈',
        hasRecord: true,
        category: '소스류',
        baseQuantity: 1000,
        jetteLinked: true,
        priceManualConfirmed: true,
        origin: [],
        allergens: [],
        originNone: false,
        allergenNone: false,
        scope: '전용',
      },
    ];

    const before = computeIngredientIssues(rows, null);
    expect(before[0].issues).toEqual(
      expect.arrayContaining(['missing-origin', 'missing-allergen'])
    );

    ingredientRows = [{ ...rows[0] }];
    await bulkSetOriginAllergenNone([1], { originNone: true, allergenNone: true });

    const after = computeIngredientIssues(
      [{ ...rows[0], originNone: true, allergenNone: true }],
      null
    );
    expect(after).toEqual([]);
  });
});

// ── removeManyTagsFromAll ────────────────────────────────────────────────────

describe('removeManyTagsFromAll', () => {
  test('여러 태그를 한 번의 스캔으로 제거한다', async () => {
    ingredientRows = [
      { id: 1, tags: ['냉동', '주재료'], ingredientName: 'A' },
      { id: 2, tags: ['냉동'], ingredientName: 'B' },
      { id: 3, tags: ['상온', '주재료'], ingredientName: 'C' },
      { id: 4, tags: ['상온'], ingredientName: 'D' },
    ];

    const result = await removeManyTagsFromAll(['냉동', '주재료']);
    expect(result).toEqual({ updated: 3 });
    expect(ingredientRows.find(r => r.id === 1).tags).toEqual([]);
    expect(ingredientRows.find(r => r.id === 2).tags).toEqual([]);
    expect(ingredientRows.find(r => r.id === 3).tags).toEqual(['상온']);
    expect(ingredientRows.find(r => r.id === 4).tags).toEqual(['상온']);
  });

  test('빈 배열이면 updated:0 반환', async () => {
    ingredientRows = [{ id: 1, tags: ['냉동'], ingredientName: 'A' }];
    const result = await removeManyTagsFromAll([]);
    expect(result).toEqual({ updated: 0 });
  });

  test('일치하는 태그가 없으면 updated:0 반환', async () => {
    ingredientRows = [{ id: 1, tags: ['상온'], ingredientName: 'A' }];
    const result = await removeManyTagsFromAll(['없는태그']);
    expect(result).toEqual({ updated: 0 });
  });

  test('tags 필드가 없는 행은 건너뛴다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await removeManyTagsFromAll(['냉동']);
    expect(result).toEqual({ updated: 0 });
  });

  test('assertActiveAdmin을 호출한다', async () => {
    ingredientRows = [{ id: 1, tags: ['냉동'], ingredientName: 'A' }];
    await removeManyTagsFromAll(['냉동']);
    expect(assertActiveAdmin).toHaveBeenCalledWith('미사용 태그 일괄 제거');
  });
});
