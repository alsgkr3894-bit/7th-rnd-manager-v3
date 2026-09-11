/**
 * 식자재 "단가 인상/인하" 이슈 확인 처리 단위 테스트.
 * setIngredientPriceChangeAcked / setIngredientPriceChangeAckedMany / computeIngredientIssues
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

const { assertActiveAdmin } = await import('@/lib/auth/guard');
const { setIngredientPriceChangeAcked, setIngredientPriceChangeAckedMany } =
  await import('../../lib/ingredient/store.js');
const { computeIngredientIssues } = await import('../../lib/ingredient/index.js');

beforeEach(() => {
  ingredientRows = [];
  nextId = 1;
  jest.clearAllMocks();
});

// ── setIngredientPriceChangeAcked ────────────────────────────────────────────

describe('setIngredientPriceChangeAcked', () => {
  test('확인 시점 단가를 priceChangeAckedPrice/At에 저장한다', async () => {
    ingredientRows = [{ id: 1, ingredientName: '치즈', priceChangeAckedPrice: null }];

    await setIngredientPriceChangeAcked(1, 19900);

    const row = ingredientRows.find(r => r.id === 1);
    expect(row.priceChangeAckedPrice).toBe(19900);
    expect(typeof row.priceChangeAckedAt).toBe('string');
  });

  test('다른 필드는 그대로 보존한다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: '치즈', category: '치즈류', tags: ['냉장'], discontinued: false },
    ];

    await setIngredientPriceChangeAcked(1, 19900);

    const row = ingredientRows.find(r => r.id === 1);
    expect(row.category).toBe('치즈류');
    expect(row.tags).toEqual(['냉장']);
    expect(row.discontinued).toBe(false);
  });

  test('존재하지 않는 id면 에러를 던진다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    await expect(setIngredientPriceChangeAcked(999, 1000)).rejects.toThrow(
      '항목을 찾을 수 없습니다'
    );
  });

  test('assertActiveAdmin을 호출한다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    await setIngredientPriceChangeAcked(1, 1000);
    expect(assertActiveAdmin).toHaveBeenCalledWith('단가 변동 확인');
  });
});

// ── setIngredientPriceChangeAckedMany ────────────────────────────────────────

describe('setIngredientPriceChangeAckedMany', () => {
  test('여러 건을 한 번에 확인 처리한다', async () => {
    ingredientRows = [
      { id: 1, ingredientName: 'A' },
      { id: 2, ingredientName: 'B' },
      { id: 3, ingredientName: 'C' },
    ];

    const result = await setIngredientPriceChangeAckedMany([
      { id: 1, price: 1000 },
      { id: 2, price: 2000 },
    ]);

    expect(result).toEqual({ acked: 2 });
    expect(ingredientRows.find(r => r.id === 1).priceChangeAckedPrice).toBe(1000);
    expect(ingredientRows.find(r => r.id === 2).priceChangeAckedPrice).toBe(2000);
    expect(ingredientRows.find(r => r.id === 3).priceChangeAckedPrice).toBeUndefined();
  });

  test('존재하지 않는 id는 건너뛴다', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await setIngredientPriceChangeAckedMany([{ id: 999, price: 1000 }]);
    expect(result).toEqual({ acked: 0 });
  });

  test('빈 배열이면 acked:0 반환', async () => {
    ingredientRows = [{ id: 1, ingredientName: 'A' }];
    const result = await setIngredientPriceChangeAckedMany([]);
    expect(result).toEqual({ acked: 0 });
  });
});

// ── computeIngredientIssues와의 연동 ──────────────────────────────────────────

describe('computeIngredientIssues — 단가 변동 확인', () => {
  function baseRow(overrides = {}) {
    return {
      id: 1,
      productCode: 'PC-001',
      ingredientName: '치즈',
      hasRecord: true,
      category: '치즈류',
      baseQuantity: 1000,
      jetteLinked: true,
      priceManualConfirmed: true,
      priceWithTax: 19900,
      origin: [{ country: 'KR' }],
      allergens: ['우유'],
      originNone: false,
      allergenNone: false,
      scope: '전용',
      priceChangeAckedPrice: null,
      priceChangeAckedAt: null,
      ...overrides,
    };
  }

  test('확인한 단가와 현재 단가가 같으면 price-up 이슈에서 제외한다', () => {
    const prevPriceMap = new Map([['PC-001', 18900]]);
    const row = baseRow({ priceChangeAckedPrice: 19900 });

    const issues = computeIngredientIssues([row], prevPriceMap);
    expect(issues).toEqual([]);
  });

  test('확인하지 않았으면 그대로 price-up 이슈가 표시된다(기존과 동일)', () => {
    const prevPriceMap = new Map([['PC-001', 18900]]);
    const row = baseRow();

    const issues = computeIngredientIssues([row], prevPriceMap);
    expect(issues).toHaveLength(1);
    expect(issues[0].issues).toContain('price-up');
  });

  test('확인 이후 단가가 또 바뀌면(acked != 현재) 다시 이슈로 표시된다', () => {
    const prevPriceMap = new Map([['PC-001', 19900]]);
    // 19,900원일 때 확인했지만 그 사이 21,000원으로 또 올랐다.
    const row = baseRow({ priceWithTax: 21000, priceChangeAckedPrice: 19900 });

    const issues = computeIngredientIssues([row], prevPriceMap);
    expect(issues).toHaveLength(1);
    expect(issues[0].issues).toContain('price-up');
  });

  test('부동소수 오차는 같은 값으로 취급한다', () => {
    const prevPriceMap = new Map([['PC-001', 18900]]);
    const row = baseRow({ priceWithTax: 19900.000001, priceChangeAckedPrice: 19900 });

    const issues = computeIngredientIssues([row], prevPriceMap);
    expect(issues).toEqual([]);
  });

  test('price-down 이슈에도 동일하게 적용된다', () => {
    const prevPriceMap = new Map([['PC-001', 20000]]);
    const row = baseRow({ priceWithTax: 18000, priceChangeAckedPrice: 18000 });

    const issues = computeIngredientIssues([row], prevPriceMap);
    expect(issues).toEqual([]);
  });
});
