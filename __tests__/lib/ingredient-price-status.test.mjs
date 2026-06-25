import {
  countMissingIngredientPackagePrices,
  getIngredientPackagePrice,
  isIngredientMissingPackagePrice,
} from '../../lib/ingredient/price-status.js';

describe('ingredient price status', () => {
  test('category/baseQuantity/unitPrice가 비어도 총가격이 있으면 단가 없음으로 보지 않는다', () => {
    const row = {
      category: '',
      baseQuantity: null,
      unitPrice: null,
      priceWithTax: 12000,
    };

    expect(getIngredientPackagePrice(row)).toBe(12000);
    expect(isIngredientMissingPackagePrice(row)).toBe(false);
  });

  test('priceOverride와 price도 단가 있음 기준으로 사용한다', () => {
    expect(isIngredientMissingPackagePrice({ priceOverride: 3500 })).toBe(false);
    expect(isIngredientMissingPackagePrice({ price: '4200' })).toBe(false);
  });

  test('가격이 없거나 0 이하이면 단가 없음으로 본다', () => {
    expect(isIngredientMissingPackagePrice({ priceWithTax: null, priceOverride: '' })).toBe(true);
    expect(isIngredientMissingPackagePrice({ priceWithTax: 0 })).toBe(true);
    expect(isIngredientMissingPackagePrice({ priceOverride: -1 })).toBe(true);
  });

  test('중단/제외 항목은 단가 없음 집계에서 제외한다', () => {
    const rows = [
      { ingredientName: 'missing' },
      { ingredientName: 'discontinued', discontinued: true },
      { ingredientName: 'excluded', excluded: true },
      { ingredientName: 'priced', priceWithTax: 1000 },
    ];

    expect(countMissingIngredientPackagePrices(rows)).toBe(1);
  });
});
