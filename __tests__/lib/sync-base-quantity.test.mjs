/**
 * __tests__/lib/sync-base-quantity.test.mjs
 *
 * buildSyncPlan 단위 테스트 (순수 함수).
 * applySyncPlan은 DB에 의존하므로 여기서 테스트하지 않음.
 */

import { buildSyncPlan } from '../../lib/cost/sync-base-quantity.js';

// ── 픽스처 ───────────────────────────────────────────────────

const ingredients = [
  { id: 1, productCode: 'A001', ingredientName: '모짜렐라', baseQuantity: 5,    baseUnitType: 'kg' },
  { id: 2, productCode: 'A002', ingredientName: '피망',     baseQuantity: null, baseUnitType: 'g'  },
  { id: 3, productCode: 'B010', ingredientName: '소금',     baseQuantity: 1000, baseUnitType: 'g'  },
  { id: 4, productCode: 'C001', ingredientName: '버터',     baseQuantity: 2,    baseUnitType: 'kg' },
];

// ── buildSyncPlan ─────────────────────────────────────────────

describe('buildSyncPlan', () => {
  // ── 기본 매칭 ─────────────────────────────────────────────

  test('변경이 있는 행은 changes에 포함된다', () => {
    const priceRows = [
      { productCode: 'A001', quantity: 10, salesUnit: 'kg', productName: '모짜렐라치즈' },
    ];
    const { changes, unchanged, unmatched } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      id: 1,
      productCode: 'A001',
      name: '모짜렐라',
      oldQty: 5,
      newQty: 10,
      unit: 'kg',
    });
    expect(unchanged).toBe(0);
    expect(unmatched).toBe(0);
  });

  test('이미 동일한 수량은 unchanged로 집계되고 changes에 포함되지 않는다', () => {
    const priceRows = [
      { productCode: 'A001', quantity: 5, salesUnit: 'kg' }, // 기존 baseQuantity=5
    ];
    const { changes, unchanged } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
    expect(unchanged).toBe(1);
  });

  test('기존 baseQuantity가 null인 항목도 수량이 있으면 changes에 포함된다', () => {
    const priceRows = [
      { productCode: 'A002', quantity: 500, salesUnit: 'g' }, // 기존 null
    ];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: 2, oldQty: null, newQty: 500 });
  });

  // ── 매칭 규칙 ─────────────────────────────────────────────

  test('productCode 대소문자 무시 매칭', () => {
    const priceRows = [{ productCode: 'a001', quantity: 20, salesUnit: 'kg' }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(1);
    expect(changes[0].id).toBe(1);
  });

  test('productCode 앞뒤 공백 무시 매칭', () => {
    const priceRows = [{ productCode: '  A001  ', quantity: 20, salesUnit: 'kg' }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(1);
    expect(changes[0].id).toBe(1);
  });

  test('매칭되지 않는 코드는 unmatched로 집계된다', () => {
    const priceRows = [
      { productCode: 'ZZZZZ', quantity: 100 },
    ];
    const { changes, unmatched } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
    expect(unmatched).toBe(1);
  });

  // ── 스킵 규칙 ─────────────────────────────────────────────

  test('quantity가 null이면 스킵 (unmatched가 아닌 조용한 스킵)', () => {
    const priceRows = [
      { productCode: 'A001', quantity: null },
    ];
    const { changes, unchanged, unmatched } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
    expect(unchanged).toBe(0);
    expect(unmatched).toBe(0); // unmatched가 아님 — 수량이 없는 것이므로
  });

  test('quantity가 0이면 스킵', () => {
    const priceRows = [{ productCode: 'A001', quantity: 0 }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
  });

  test('quantity가 음수이면 스킵', () => {
    const priceRows = [{ productCode: 'A001', quantity: -5 }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
  });

  test('quantity가 빈 문자열이면 스킵', () => {
    const priceRows = [{ productCode: 'A001', quantity: '' }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
  });

  test('quantity가 NaN 문자열이면 스킵', () => {
    const priceRows = [{ productCode: 'A001', quantity: 'N/A' }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
  });

  test('quantity가 undefined이면 스킵', () => {
    const priceRows = [{ productCode: 'A001' }]; // quantity 키 없음
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(0);
  });

  test('콤마 포함 숫자 문자열은 파싱 가능', () => {
    const priceRows = [{ productCode: 'A001', quantity: '1,000' }];
    const { changes } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(1);
    expect(changes[0].newQty).toBe(1000);
  });

  // ── 이름 fallback ────────────────────────────────────────

  test('name: ingredientName 우선 → productName → productCode 순서', () => {
    // 1) ingredientName 있는 경우
    const rows1 = [{ productCode: 'A001', quantity: 99, productName: '치즈대용' }];
    const { changes: c1 } = buildSyncPlan(rows1, ingredients);
    expect(c1[0].name).toBe('모짜렐라'); // ingredient의 ingredientName 우선

    // 2) ingredientName 빈 경우 → productName
    const ing2 = [{ id: 10, productCode: 'X001', ingredientName: '', baseQuantity: 1 }];
    const rows2 = [{ productCode: 'X001', quantity: 5, productName: '특수재료' }];
    const { changes: c2 } = buildSyncPlan(rows2, ing2);
    expect(c2[0].name).toBe('특수재료');

    // 3) 둘 다 없는 경우 → productCode
    const ing3 = [{ id: 11, productCode: 'Y001', ingredientName: '', baseQuantity: 1 }];
    const rows3 = [{ productCode: 'Y001', quantity: 5 }];
    const { changes: c3 } = buildSyncPlan(rows3, ing3);
    expect(c3[0].name).toBe('Y001');
  });

  // ── 단위 fallback ────────────────────────────────────────

  test('unit: baseUnitType 우선 → salesUnit → 기본값 g', () => {
    // 1) baseUnitType 있는 경우
    const ing1 = [{ id: 1, productCode: 'A001', ingredientName: '모짜렐라', baseQuantity: 5, baseUnitType: 'kg' }];
    const rows1 = [{ productCode: 'A001', quantity: 10, salesUnit: 'L' }];
    const { changes: c1 } = buildSyncPlan(rows1, ing1);
    expect(c1[0].unit).toBe('kg');

    // 2) baseUnitType 없는 경우 → salesUnit
    const ing2 = [{ id: 2, productCode: 'B001', ingredientName: '소금', baseQuantity: 100 }]; // baseUnitType 없음
    const rows2 = [{ productCode: 'B001', quantity: 200, salesUnit: 'g' }];
    const { changes: c2 } = buildSyncPlan(rows2, ing2);
    expect(c2[0].unit).toBe('g');

    // 3) 둘 다 없는 경우 → 'g'
    const ing3 = [{ id: 3, productCode: 'C001', ingredientName: '기름', baseQuantity: 1 }];
    const rows3 = [{ productCode: 'C001', quantity: 2 }];
    const { changes: c3 } = buildSyncPlan(rows3, ing3);
    expect(c3[0].unit).toBe('g');
  });

  // ── 복합 시나리오 ────────────────────────────────────────

  test('변경/미변경/미매칭 복합', () => {
    const priceRows = [
      { productCode: 'A001', quantity: 8    },  // 변경 (기존 5)
      { productCode: 'B010', quantity: 1000 },  // 동일 (unchanged)
      { productCode: 'ZZZZ', quantity: 200  },  // 미매칭
      { productCode: 'A002', quantity: 300  },  // 변경 (기존 null)
    ];
    const { changes, unchanged, unmatched } = buildSyncPlan(priceRows, ingredients);
    expect(changes).toHaveLength(2);
    expect(unchanged).toBe(1);
    expect(unmatched).toBe(1);
    expect(changes.find(c => c.productCode === 'A001')).toBeDefined();
    expect(changes.find(c => c.productCode === 'A002')).toBeDefined();
  });

  // ── 방어적 입력 처리 ────────────────────────────────────

  test('priceRows가 빈 배열이면 모두 0 반환', () => {
    const result = buildSyncPlan([], ingredients);
    expect(result.changes).toHaveLength(0);
    expect(result.unchanged).toBe(0);
    expect(result.unmatched).toBe(0);
  });

  test('ingredients가 빈 배열이면 모두 unmatched', () => {
    const priceRows = [
      { productCode: 'A001', quantity: 10 },
      { productCode: 'A002', quantity: 20 },
    ];
    const { changes, unmatched } = buildSyncPlan(priceRows, []);
    expect(changes).toHaveLength(0);
    expect(unmatched).toBe(2);
  });

  test('null/undefined 입력도 안전하게 빈 결과 반환', () => {
    expect(() => buildSyncPlan(null, null)).not.toThrow();
    const result = buildSyncPlan(null, null);
    expect(result.changes).toHaveLength(0);
  });

  test('productCode 없는 ingredient는 매칭 인덱스에서 제외', () => {
    const ing = [
      { id: 99, productCode: '', ingredientName: '수동재료', baseQuantity: 1 },
      { id: 1,  productCode: 'A001', ingredientName: '모짜렐라', baseQuantity: 5 },
    ];
    const priceRows = [{ productCode: 'A001', quantity: 10 }];
    const { changes } = buildSyncPlan(priceRows, ing);
    expect(changes).toHaveLength(1);
    expect(changes[0].id).toBe(1);
  });
});
