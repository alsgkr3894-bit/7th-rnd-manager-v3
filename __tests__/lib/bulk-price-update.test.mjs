/**
 * __tests__/lib/bulk-price-update.test.mjs
 *
 * 순수 함수 (parseBulkPriceRows, matchAndApply) 단위 테스트.
 * DB 접근이 있는 commitBulkPrice는 여기서 테스트하지 않음.
 */

import { parseBulkPriceRows, matchAndApply } from '../../lib/cost/bulk-price-update.js';

// ── parseBulkPriceRows ────────────────────────────────────────

describe('parseBulkPriceRows', () => {
  test('빈 배열은 빈 배열 반환', () => {
    expect(parseBulkPriceRows([])).toEqual([]);
    expect(parseBulkPriceRows(null)).toEqual([]);
    expect(parseBulkPriceRows(undefined)).toEqual([]);
  });

  test('표준 한국어 헤더 인식', () => {
    const rows = [
      { 상품코드: 'A001', 재료명: '모짜렐라', 단가: 5000 },
      { 상품코드: 'A002', 재료명: '피망',     단가: 1200 },
    ];
    const result = parseBulkPriceRows(rows);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ productCode: 'A001', ingredientName: '모짜렐라', newPrice: 5000 });
    expect(result[1]).toMatchObject({ productCode: 'A002', ingredientName: '피망',     newPrice: 1200 });
  });

  test('대안 헤더 인식: 제품코드, 품목명, 가격', () => {
    const rows = [{ 제품코드: 'B010', 품목명: '소금', 가격: 800 }];
    const result = parseBulkPriceRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ productCode: 'B010', newPrice: 800 });
  });

  test('영어 헤더 인식: productCode, price', () => {
    const rows = [{ productCode: 'C100', price: 3300 }];
    const result = parseBulkPriceRows(rows);
    expect(result[0]).toMatchObject({ productCode: 'C100', newPrice: 3300 });
  });

  test('콤마·원 포함 가격 문자열 파싱', () => {
    const rows = [{ 상품코드: 'D001', 단가: '2,500원' }];
    const result = parseBulkPriceRows(rows);
    expect(result[0].newPrice).toBe(2500);
  });

  test('상품코드 없는 행 스킵', () => {
    const rows = [
      { 상품코드: '',    단가: 1000 },
      { 상품코드: 'E001', 단가: 2000 },
    ];
    expect(parseBulkPriceRows(rows)).toHaveLength(1);
  });

  test('가격이 0이거나 음수인 행 스킵', () => {
    const rows = [
      { 상품코드: 'F001', 단가: 0 },
      { 상품코드: 'F002', 단가: -500 },
      { 상품코드: 'F003', 단가: 100 },
    ];
    const result = parseBulkPriceRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].productCode).toBe('F003');
  });

  test('가격이 없거나 문자인 행 스킵', () => {
    const rows = [
      { 상품코드: 'G001', 단가: '' },
      { 상품코드: 'G002', 단가: 'N/A' },
      { 상품코드: 'G003', 단가: 500 },
    ];
    const result = parseBulkPriceRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].productCode).toBe('G003');
  });

  test('앞뒤 공백 제거', () => {
    const rows = [{ 상품코드: '  H001  ', 재료명: ' 버터 ', 단가: 4000 }];
    const result = parseBulkPriceRows(rows);
    expect(result[0].productCode).toBe('H001');
    expect(result[0].ingredientName).toBe('버터');
  });

  test('재료명 없는 행은 ingredientName 키 없음', () => {
    const rows = [{ 상품코드: 'I001', 단가: 1000 }];
    const result = parseBulkPriceRows(rows);
    expect('ingredientName' in result[0]).toBe(false);
  });
});

// ── matchAndApply ─────────────────────────────────────────────

describe('matchAndApply', () => {
  const existingIngredients = [
    { id: 1, productCode: 'A001', ingredientName: '모짜렐라', priceOverride: 4500 },
    { id: 2, productCode: 'A002', ingredientName: '피망',     priceOverride: null },
    { id: 3, productCode: 'B010', ingredientName: '소금',     priceOverride: 750 },
  ];

  test('정확한 매칭', () => {
    const parsed = [
      { productCode: 'A001', newPrice: 5000 },
      { productCode: 'B010', newPrice: 900 },
    ];
    const { matched, unmatched } = matchAndApply(parsed, existingIngredients);
    expect(matched).toHaveLength(2);
    expect(unmatched).toHaveLength(0);

    const m1 = matched.find(m => m.productCode === 'A001');
    expect(m1).toMatchObject({ id: 1, oldPrice: 4500, newPrice: 5000 });

    const m2 = matched.find(m => m.productCode === 'B010');
    expect(m2).toMatchObject({ id: 3, oldPrice: 750, newPrice: 900 });
  });

  test('기존 priceOverride=null이면 oldPrice: null', () => {
    const parsed = [{ productCode: 'A002', newPrice: 1200 }];
    const { matched } = matchAndApply(parsed, existingIngredients);
    expect(matched[0].oldPrice).toBeNull();
    expect(matched[0].newPrice).toBe(1200);
  });

  test('매칭 안 된 항목은 unmatched로', () => {
    const parsed = [{ productCode: 'ZZZZ', newPrice: 9999 }];
    const { matched, unmatched } = matchAndApply(parsed, existingIngredients);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0]).toMatchObject({ productCode: 'ZZZZ', newPrice: 9999 });
  });

  test('대소문자 무시 매칭', () => {
    const existing = [{ id: 10, productCode: 'abc123', ingredientName: '테스트', priceOverride: 1000 }];
    const parsed = [{ productCode: 'ABC123', newPrice: 2000 }];
    const { matched } = matchAndApply(parsed, existing);
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(10);
  });

  test('앞뒤 공백 무시 매칭', () => {
    const existing = [{ id: 20, productCode: ' X001 ', ingredientName: '채소', priceOverride: 300 }];
    const parsed = [{ productCode: 'X001', newPrice: 400 }];
    const { matched } = matchAndApply(parsed, existing);
    expect(matched).toHaveLength(1);
  });

  test('빈 입력', () => {
    const result = matchAndApply([], existingIngredients);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });

  test('productCode 없는 기존 식자재는 인덱싱 제외', () => {
    const existing = [
      { id: 99, productCode: '', ingredientName: '수동재료', priceOverride: 500 },
      { id: 1,  productCode: 'A001', ingredientName: '모짜렐라', priceOverride: 4500 },
    ];
    const parsed = [{ productCode: 'A001', newPrice: 5000 }];
    const { matched } = matchAndApply(parsed, existing);
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(1);
  });

  test('name 필드: ingredientName 우선, 없으면 parsedRow.ingredientName, 없으면 productCode', () => {
    const existing = [
      { id: 1, productCode: 'A001', ingredientName: '모짜렐라', priceOverride: null },
    ];
    // existing의 ingredientName이 있을 때
    let { matched } = matchAndApply([{ productCode: 'A001', ingredientName: '치즈', newPrice: 100 }], existing);
    expect(matched[0].name).toBe('모짜렐라');

    // ingredientName이 빈 문자열일 때 → parsedRow 우선
    const existing2 = [{ id: 2, productCode: 'B001', ingredientName: '', priceOverride: null }];
    ({ matched } = matchAndApply([{ productCode: 'B001', ingredientName: '피망', newPrice: 200 }], existing2));
    expect(matched[0].name).toBe('피망');

    // 둘 다 없을 때 → productCode
    const existing3 = [{ id: 3, productCode: 'C001', ingredientName: '', priceOverride: null }];
    ({ matched } = matchAndApply([{ productCode: 'C001', newPrice: 300 }], existing3));
    expect(matched[0].name).toBe('C001');
  });
});
