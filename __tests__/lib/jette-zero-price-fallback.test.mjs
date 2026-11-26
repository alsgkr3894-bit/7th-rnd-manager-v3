import { describe, expect, test } from '@jest/globals';
import { mergeIngredientRows } from '../../lib/ingredient/index.js';
import { buildIngredientPriceRows } from '../../lib/cost/ingredient-price/buildRows.js';
import { buildUnitPriceMap } from '../../lib/recipe/index.js';

const meta = {
  id: 1,
  productCode: 'A',
  ingredientName: '치즈',
  baseQuantity: 100,
  priceOverride: 500,
};

describe('제때 단가 0은 수동 단가로 계산한다', () => {
  test.each([
    [0, 5],
    [800, 8],
  ])('제때 단가 %i원 → 단위 단가 %i원이 모든 화면에서 같다', (priceWithTax, expected) => {
    const priceRow = { productCode: 'A', productName: '치즈', priceWithTax };
    const priceRows = new Map([['A', priceRow]]);

    expect(mergeIngredientRows([priceRow], new Map([['A', meta]]))[0].unitPrice).toBe(expected);
    expect(
      buildIngredientPriceRows([meta], priceRows, new Map(), null, new Set(['A']), new Map())[0]
        .unitPrice
    ).toBe(expected);
    expect(buildUnitPriceMap([meta], priceRows).get('A').unitPrice).toBe(expected);
  });
});
