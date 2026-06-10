import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let ingredientRows = [];
let nutritionRows = [];
let nextId = 100;

function upsertRow(record) {
  const row = { ...record };
  if (row.id == null) row.id = nextId++;
  const index = ingredientRows.findIndex(item => item.id === row.id);
  if (index >= 0) ingredientRows[index] = row;
  else ingredientRows.push(row);
  return row.id;
}

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(() => true),
  getAll: jest.fn(storeName => {
    if (storeName === 'cost_ingredients') return Promise.resolve([...ingredientRows]);
    if (storeName === 'nutrition_ingredient_values') return Promise.resolve([...nutritionRows]);
    return Promise.resolve([]);
  }),
  runTransaction: jest.fn((storeNames, mode, work) => {
    const tx = {
      objectStore(storeName) {
        if (storeName !== 'cost_ingredients') throw new Error(`unexpected store: ${storeName}`);
        return {
          add(record) {
            upsertRow(record);
          },
          put(record) {
            upsertRow(record);
          },
          delete(id) {
            ingredientRows = ingredientRows.filter(row => row.id !== id);
          },
          clear() {
            ingredientRows = [];
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

const {
  addIngredient,
  updateIngredient,
  bulkImportIngredients,
  getIngredientMetaMap,
  buildIngredientProductCodeDuplicateDiagnostics,
  repairIngredientProductCodeDuplicates,
} = await import('../../lib/ingredient/store.js');

beforeEach(() => {
  ingredientRows = [];
  nutritionRows = [];
  nextId = 100;
  jest.clearAllMocks();
});

describe('ingredient productCode duplicate guards', () => {
  test('addIngredient는 이미 존재하는 productCode 신규 등록을 막는다', async () => {
    ingredientRows = [{ id: 1, productCode: 'PC-001', ingredientName: '기존' }];

    await expect(
      addIngredient({ productCode: ' PC-001 ', ingredientName: '중복', isManual: true })
    ).rejects.toThrow('이미 등록된 제품코드입니다');
    expect(ingredientRows).toHaveLength(1);
  });

  test('updateIngredient는 다른 행의 productCode로 변경하지 못한다', async () => {
    ingredientRows = [
      { id: 1, productCode: 'PC-001', ingredientName: '기존' },
      { id: 2, productCode: 'PC-002', ingredientName: '수정대상' },
    ];

    await expect(
      updateIngredient(2, { productCode: 'PC-001', ingredientName: '수정대상' })
    ).rejects.toThrow('이미 등록된 제품코드입니다');
  });

  test('bulkImportIngredients는 같은 import 안의 productCode 중복을 1건으로 접는다', async () => {
    const result = await bulkImportIngredients([
      { productCode: 'PC-001', productName: '첫번째', category: '토핑재료' },
      { productCode: 'PC-001', productName: '두번째', category: '토핑재료' },
    ]);

    expect(result).toMatchObject({ inserted: 1, updated: 0, total: 1 });
    expect(ingredientRows).toHaveLength(1);
    expect(ingredientRows[0]).toMatchObject({
      productCode: 'PC-001',
      ingredientName: '두번째',
    });
  });

  test('getIngredientMetaMap은 대소문자 변형 중복도 대표행으로 조회한다', async () => {
    ingredientRows = [
      {
        id: 1,
        productCode: 'PC-001',
        ingredientName: '오래된 행',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        productCode: 'pc-001',
        ingredientName: '대표 행',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    const map = await getIngredientMetaMap();

    expect(map.get('PC-001')).toMatchObject({ id: 2, ingredientName: '대표 행' });
    expect(map.get('pc-001')).toMatchObject({ id: 2, ingredientName: '대표 행' });
  });

  test('중복 정리는 대표행에 태그와 알레르기를 병합하고 나머지를 삭제한다', async () => {
    ingredientRows = [
      {
        id: 1,
        productCode: 'PC-001',
        ingredientName: '오래된 행',
        tags: ['A'],
        allergens: ['AL01'],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        productCode: 'PC-001',
        ingredientName: '대표 행',
        tags: ['B'],
        allergens: ['AL02'],
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ];
    nutritionRows = [{ id: 7, productCode: 'PC-001', kcal: 100 }];

    const before = buildIngredientProductCodeDuplicateDiagnostics(ingredientRows, nutritionRows);
    expect(before.groups[0]).toMatchObject({
      keepId: 2,
      removeIds: [1],
      hasNutritionValue: true,
    });

    const result = await repairIngredientProductCodeDuplicates();

    expect(result.removed).toBe(1);
    expect(ingredientRows).toHaveLength(1);
    expect(ingredientRows[0]).toMatchObject({ id: 2, ingredientName: '대표 행' });
    expect(ingredientRows[0].tags.sort()).toEqual(['A', 'B']);
    expect(ingredientRows[0].allergens.sort()).toEqual(['AL01', 'AL02']);
  });
});
