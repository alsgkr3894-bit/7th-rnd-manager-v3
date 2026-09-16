import { beforeEach, describe, expect, jest, test } from '@jest/globals';

/**
 * upsertIngredientMeta(제때 연동 식자재 저장 경로)가 baseQuantity/pieceWeightGrams를
 * 빈 값으로 지울 수 있는지 검증한다. 폼이 필드를 비우면 patch에 null이 실려 오는데,
 * `!= null` 가드로 걸러내면 그 null이 existing 값으로 되돌아가 지울 수 없었다(버그).
 */
let stores = {};

function rows(name) {
  return (stores[name] ??= []);
}

function makeObjectStore(name) {
  return {
    put(record) {
      const idx = rows(name).findIndex(r => r.id === record.id);
      if (idx >= 0) rows(name)[idx] = record;
      else rows(name).push(record);
    },
  };
}

const runTransaction = jest.fn((storeNames, mode, work) => {
  const allowed = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = {
    objectStore(name) {
      if (!allowed.includes(name)) throw new Error(`unexpected store: ${name}`);
      return makeObjectStore(name);
    },
  };
  work(tx);
  return Promise.resolve();
});
const assertActiveAdmin = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(name => name in stores),
  getAll: jest.fn(name => Promise.resolve([...rows(name)])),
  runTransaction,
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin }));

const { upsertIngredientMeta } = await import('../../lib/ingredient/crud.js');

describe('upsertIngredientMeta — baseQuantity/pieceWeightGrams 비우기', () => {
  beforeEach(() => {
    runTransaction.mockClear();
    assertActiveAdmin.mockReset();
    assertActiveAdmin.mockResolvedValue();
    stores = {
      cost_ingredients: [
        {
          id: 1,
          productCode: 'JT01',
          ingredientName: '계란',
          baseQuantity: 30,
          baseUnitType: '개',
          pieceWeightGrams: 60,
        },
      ],
    };
  });

  test('patch에 null을 명시하면 기존 값을 지운다', async () => {
    await upsertIngredientMeta({
      productCode: 'JT01',
      baseQuantity: null,
      pieceWeightGrams: null,
    });
    const saved = stores.cost_ingredients.find(r => r.id === 1);
    expect(saved.baseQuantity).toBeNull();
    expect(saved.pieceWeightGrams).toBeNull();
  });

  test('patch에 키 자체가 없으면 기존 값을 유지한다', async () => {
    await upsertIngredientMeta({ productCode: 'JT01', note: '메모만 변경' });
    const saved = stores.cost_ingredients.find(r => r.id === 1);
    expect(saved.baseQuantity).toBe(30);
    expect(saved.pieceWeightGrams).toBe(60);
  });

  test('소문자·공백 섞인 코드는 대문자로 정규화해 저장하고 기존 행(대소문자 무관)을 갱신한다', async () => {
    await upsertIngredientMeta({ productCode: ' jt01 ', note: '소문자로 들어옴' });
    expect(stores.cost_ingredients).toHaveLength(1);
    const saved = stores.cost_ingredients.find(r => r.id === 1);
    expect(saved.productCode).toBe('JT01');
    expect(saved.note).toBe('소문자로 들어옴');
  });

  test('신규 행도 대문자 코드로 만들어진다', async () => {
    await upsertIngredientMeta({ productCode: 'cc999x', ingredientName: '새 재료' });
    const created = stores.cost_ingredients.find(r => r.ingredientName === '새 재료');
    expect(created.productCode).toBe('CC999X');
  });
});
