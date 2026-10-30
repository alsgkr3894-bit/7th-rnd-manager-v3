import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 2026-10-30 원가 흐름 점검(식자재 관리): 단가를 뒤집는 입력을 저장 단계에서 막는다.
let stores = {};
const rows = name => (stores[name] ??= []);
const runTransaction = jest.fn((storeNames, mode, work) => {
  const tx = {
    objectStore: name => ({
      put(record) {
        const idx = rows(name).findIndex(r => r.id === record.id);
        if (idx >= 0) rows(name)[idx] = record;
        else rows(name).push({ id: rows(name).length + 1, ...record });
      },
    }),
  };
  work(tx);
  return Promise.resolve();
});

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(name => name in stores),
  getAll: jest.fn(name => Promise.resolve([...rows(name)])),
  runTransaction,
}));
jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin: jest.fn() }));
jest.unstable_mockModule('@/lib/price/price-events', () => ({ emitPriceChange: jest.fn() }));

const { upsertIngredientMeta } = await import('../../lib/ingredient/crud.js');
const { bulkImportIngredients, normalizeImportedPack } =
  await import('../../lib/ingredient/import.js');

describe('제때 연동 식자재 저장 — 음수 입력 차단', () => {
  beforeEach(() => {
    stores = {
      cost_ingredients: [
        {
          id: 1,
          productCode: 'JT01',
          ingredientName: '계란',
          baseQuantity: 30,
          baseUnitType: '개',
        },
      ],
    };
  });

  test.each([
    ['baseQuantity', -1, '포장수량'],
    ['priceOverride', -100, '수동 단가'],
    ['pieceWeightGrams', -5, '1개당 무게'],
  ])('%s 음수는 저장하지 않고 이유를 알린다', async (field, value, label) => {
    await expect(upsertIngredientMeta({ productCode: 'JT01', [field]: value })).rejects.toThrow(
      label
    );
    expect(rows('cost_ingredients')[0].baseQuantity).toBe(30); // 기존 값 그대로
  });

  test('0·양수·빈 값(지우기)은 그대로 저장된다', async () => {
    await upsertIngredientMeta({ productCode: 'JT01', baseQuantity: 12, priceOverride: 0 });
    expect(rows('cost_ingredients')[0]).toMatchObject({ baseQuantity: 12, priceOverride: 0 });
    await upsertIngredientMeta({ productCode: 'JT01', baseQuantity: null });
    expect(rows('cost_ingredients')[0].baseQuantity).toBeNull();
  });
});

describe('식자재 일괄 가져오기 — 포장 단위와 단종 상태', () => {
  test('kg는 g로 바꿔 ×1000 한다(그대로 저장하면 단가가 1000배)', () => {
    expect(normalizeImportedPack({ baseQuantity: 2, baseUnitType: 'kg' })).toEqual({
      baseQuantity: 2000,
      baseUnitType: 'g',
    });
    expect(normalizeImportedPack({ baseQuantity: 500, baseUnitType: 'g' })).toEqual({
      baseQuantity: 500,
      baseUnitType: 'g',
    });
    expect(normalizeImportedPack({ baseQuantity: 30, baseUnitType: 'ea' })).toEqual({
      baseQuantity: 30,
      baseUnitType: '개',
    });
  });

  test('모르는 단위는 g로 보고, 수량이 없으면 기존 수량을 유지한다', () => {
    expect(normalizeImportedPack({ baseQuantity: 7, baseUnitType: 'L' })).toEqual({
      baseQuantity: 7,
      baseUnitType: 'g',
    });
    expect(
      normalizeImportedPack({ baseUnitType: 'kg' }, { baseQuantity: 900, baseUnitType: 'g' })
    ).toEqual({ baseQuantity: 900, baseUnitType: 'g' });
  });

  test('파일에 단종 칸이 없으면 기존 단종 상태를 지우지 않는다', async () => {
    stores = {
      cost_ingredients: [
        {
          id: 1,
          productCode: 'A1',
          ingredientName: '단종템',
          discontinued: true,
          baseQuantity: 10,
        },
        {
          id: 2,
          productCode: 'B1',
          ingredientName: '판매템',
          discontinued: false,
          baseQuantity: 10,
        },
      ],
    };
    await bulkImportIngredients([
      { productCode: 'a1', productName: '단종템' }, // 단종 칸 없음 → 유지
      { productCode: 'b1', productName: '판매템', discontinued: true }, // 명시하면 그대로 반영
    ]);
    const byCode = Object.fromEntries(rows('cost_ingredients').map(r => [r.productCode, r]));
    expect(byCode.A1.discontinued).toBe(true);
    expect(byCode.B1.discontinued).toBe(true);
  });

  test('명시적으로 단종을 풀면(false) 풀린다', async () => {
    stores = {
      cost_ingredients: [
        {
          id: 1,
          productCode: 'A1',
          ingredientName: '단종템',
          discontinued: true,
          baseQuantity: 10,
        },
      ],
    };
    await bulkImportIngredients([
      { productCode: 'A1', productName: '단종템', discontinued: false },
    ]);
    expect(rows('cost_ingredients')[0].discontinued).toBe(false);
  });
});
