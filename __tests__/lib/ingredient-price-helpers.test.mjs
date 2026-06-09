import { sumCompositePrice } from '../../lib/cost/ingredient-price-helpers.js';

describe('sumCompositePrice', () => {
  const makeMap = entries =>
    new Map(entries.map(([code, price]) => [code, { priceWithTax: price }]));

  test('returns null for null/undefined compositeOf', () => {
    const lookup = makeMap([['A', 100]]);
    expect(sumCompositePrice(null, lookup)).toBeNull();
    expect(sumCompositePrice(undefined, lookup)).toBeNull();
  });

  test('returns null for empty compositeOf array', () => {
    const lookup = makeMap([['A', 100]]);
    expect(sumCompositePrice([], lookup)).toBeNull();
  });

  test('sums prices for all matching codes', () => {
    const lookup = makeMap([
      ['A', 1000],
      ['B', 2000],
    ]);
    expect(sumCompositePrice(['A', 'B'], lookup)).toBe(3000);
  });

  test('partial sum — missing codes treated as 0', () => {
    const lookup = makeMap([['A', 1500]]);
    // 'B' is absent → contributes 0
    expect(sumCompositePrice(['A', 'B'], lookup)).toBe(1500);
  });

  test('returns null when all codes are missing (sum === 0)', () => {
    const lookup = makeMap([]);
    expect(sumCompositePrice(['X', 'Y'], lookup)).toBeNull();
  });

  test('returns null when sum is exactly 0 (all prices are 0)', () => {
    const lookup = makeMap([
      ['A', 0],
      ['B', 0],
    ]);
    expect(sumCompositePrice(['A', 'B'], lookup)).toBeNull();
  });

  test('single-element composite', () => {
    const lookup = makeMap([['Z', 999]]);
    expect(sumCompositePrice(['Z'], lookup)).toBe(999);
  });
});
