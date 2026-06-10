import { buildUnitPriceMap } from '../../lib/recipe/index.js';

describe('buildUnitPriceMap composite price policy', () => {
  const priceRows = entries =>
    new Map(entries.map(([code, price]) => [code, { priceWithTax: price }]));

  test('uses strict composite sum when every component price exists', () => {
    const result = buildUnitPriceMap(
      [
        {
          productCode: 'COMBO',
          ingredientName: '합산 식자재',
          baseQuantity: 100,
          baseUnitType: 'g',
          compositeOf: ['A', 'B'],
          priceOverride: 9999,
        },
      ],
      priceRows([
        ['A', 1000],
        ['B', 2000],
      ])
    );

    expect(result.get('COMBO')).toMatchObject({
      priceWithTax: 3000,
      unitPrice: 30,
    });
  });

  test('falls back to override instead of partial composite sum', () => {
    const result = buildUnitPriceMap(
      [
        {
          productCode: 'COMBO',
          ingredientName: '합산 식자재',
          baseQuantity: 100,
          baseUnitType: 'g',
          compositeOf: ['A', 'B'],
          priceOverride: 5000,
        },
      ],
      priceRows([['A', 1000]])
    );

    expect(result.get('COMBO')).toMatchObject({
      priceWithTax: 5000,
      unitPrice: 50,
    });
  });

  test('returns null price when composite is incomplete and no override exists', () => {
    const result = buildUnitPriceMap(
      [
        {
          productCode: 'COMBO',
          ingredientName: '합산 식자재',
          baseQuantity: 100,
          baseUnitType: 'g',
          compositeOf: ['A', 'B'],
        },
      ],
      priceRows([['A', 1000]])
    );

    expect(result.get('COMBO')).toMatchObject({
      priceWithTax: null,
      unitPrice: null,
    });
  });
});
