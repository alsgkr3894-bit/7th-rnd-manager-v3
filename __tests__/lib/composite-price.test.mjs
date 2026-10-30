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
      missingCodes: ['A', 'B', 'C'],
      pricedCodes: [],
    });
  });

  // 2026-10-30 원가 흐름 점검: 0원 구성품을 "가격 있음"으로 세면 strict 합산이 완전한 것처럼 통과해
  // 원가가 과소 계산된다
  test('strict: 0원 구성품이 있으면 가격 없음으로 본다(과소 원가 방지)', () => {
    const lookup = makeMap([
      ['A', 1000],
      ['B', 0],
    ]);
    expect(resolveCompositePrice(['A', 'B'], lookup, { mode: 'strict' })).toMatchObject({
      priceWithTax: null,
      isComplete: false,
      missingCodes: ['B'],
    });
    // partial(단가표 참고용)은 가격 있는 것만 합산
    expect(resolveCompositePrice(['A', 'B'], lookup, { mode: 'partial' })).toMatchObject({
      priceWithTax: 1000,
      pricedCodes: ['A'],
    });
  });
});
