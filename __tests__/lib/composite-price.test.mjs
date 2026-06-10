import { resolveCompositePrice } from '../../lib/cost/composite-price.js';

describe('resolveCompositePrice', () => {
  const makeMap = entries =>
    new Map(entries.map(([code, price]) => [code, { priceWithTax: price }]));

  test('strict mode sums only when every component has a price', () => {
    const lookup = makeMap([
      ['A', 1000],
      ['B', 2000],
    ]);

    expect(resolveCompositePrice(['A', 'B'], lookup, { mode: 'strict' })).toMatchObject({
      priceWithTax: 3000,
      isComplete: true,
      missingCodes: [],
      pricedCodes: ['A', 'B'],
    });
  });

  test('strict mode returns null when any component is missing', () => {
    const lookup = makeMap([['A', 1000]]);

    expect(resolveCompositePrice(['A', 'B'], lookup, { mode: 'strict' })).toMatchObject({
      priceWithTax: null,
      isComplete: false,
      missingCodes: ['B'],
      pricedCodes: ['A'],
    });
  });

  test('partial mode keeps the available component sum', () => {
    const lookup = makeMap([['A', 1000]]);

    expect(resolveCompositePrice(['A', 'B'], lookup, { mode: 'partial' })).toMatchObject({
      priceWithTax: 1000,
      isComplete: false,
      missingCodes: ['B'],
      pricedCodes: ['A'],
    });
  });

  test('lookup trims and matches product codes case-insensitively', () => {
    const lookup = makeMap([['CC-001', '1500']]);

    expect(resolveCompositePrice([' cc-001 '], lookup, { mode: 'strict' })).toMatchObject({
      priceWithTax: 1500,
      isComplete: true,
      missingCodes: [],
    });
  });

  test('invalid and zero-only component prices resolve to null', () => {
    const lookup = makeMap([
      ['A', 'bad'],
      ['B', 0],
      ['C', ''],
    ]);

    expect(resolveCompositePrice(['A', 'B', 'C'], lookup, { mode: 'partial' })).toMatchObject({
      priceWithTax: null,
      isComplete: false,
      missingCodes: ['A', 'C'],
      pricedCodes: ['B'],
    });
  });
});
