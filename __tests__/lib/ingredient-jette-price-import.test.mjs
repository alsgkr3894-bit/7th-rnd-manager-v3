import {
  buildIngredientDraftFromJettePrice,
  filterJettePriceRows,
  getJettePriceDisplayName,
  normalizeJetteProductCode,
} from '../../lib/ingredient/jette-price-import.js';

describe('ingredient jette price import helpers', () => {
  test('제때 행에서 식자재 폼 적용값을 만든다', () => {
    const draft = buildIngredientDraftFromJettePrice({
      productCode: ' CC-001 ',
      productName: ' 냉동 모짜렐라치즈 2kg ',
      taxType: '과세',
      temperature: '냉동',
      priceWithTax: 12340,
    });

    expect(draft).toEqual({
      productCode: 'CC-001',
      ingredientName: getJettePriceDisplayName({ productName: '냉동 모짜렐라치즈 2kg' }),
      taxType: '과세',
      temperature: '냉동',
      priceOverride: '12340',
    });
  });

  test('검색은 코드/제품명/온도/단위 기준으로 찾고 중복 등록 상태를 표시한다', () => {
    const rows = [
      {
        productCode: 'A-001',
        productName: '모짜렐라치즈',
        temperature: '냉장',
        salesUnit: '봉',
        taxType: '과세',
      },
      {
        productCode: 'B-001',
        productName: '피망',
        temperature: '냉동',
        salesUnit: '팩',
        taxType: '면세',
      },
    ];

    const results = filterJettePriceRows(rows, '냉동', {
      existingProductCodes: ['B-001'],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      productCode: 'B-001',
      productName: '피망',
      alreadyRegistered: true,
    });
  });

  test('현재 편집 중인 제품코드는 중복 등록으로 막지 않는다', () => {
    const [result] = filterJettePriceRows(
      [{ productCode: 'A-001', productName: '치즈' }],
      'a-001',
      {
        existingProductCodes: ['A-001'],
        currentProductCode: 'a-001',
      }
    );

    expect(normalizeJetteProductCode(result.productCode)).toBe('a-001');
    expect(result.alreadyRegistered).toBe(false);
  });
});
