import {
  buildIngredientUsageMap,
  sumCompositePrice,
} from '../../lib/cost/ingredient-price-helpers.js';

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

describe('buildIngredientUsageMap', () => {
  test('직접 레시피, 공통묶음, 엣지, 파생메뉴를 단일 매핑 기준으로 포함한다', () => {
    const { byCode, byName } = buildIngredientUsageMap({
      menuMasters: [
        { menuCode: 'PZ-001-L', menuName: '슈퍼콤비네이션 L', category: '피자' },
        { menuCode: 'SIDE-001', menuName: '치즈볼', category: '사이드' },
        { menuCode: 'DER-001', menuName: '파생피자', category: '피자' },
      ],
      detailRecipes: [
        {
          menuCode: 'PZ-001-L',
          menuName: '슈퍼콤비네이션 L',
          category: '피자',
          components: [{ productCode: 'ING-SAUCE', ingredientName: '토마토소스' }],
        },
      ],
      groups: [
        {
          name: '사이드 공통',
          defaultCategories: ['사이드'],
          ingredients: [{ productCode: 'ING-GROUP', ingredientName: '공통분말' }],
        },
      ],
      edges: [
        {
          edgeType: '치즈크러스트',
          expandInMargin: true,
          components: [{ productCode: 'ING-EDGE', ingredientName: '엣지치즈' }],
        },
      ],
      compositions: [
        {
          menuCode: 'DER-001',
          menuName: '파생피자',
          ingredientCodes: ['ING-DERIVED'],
        },
      ],
    });

    expect(byCode.get('ING-SAUCE')).toEqual(new Map([['슈퍼콤비네이션', '피자']]));
    expect(byName.get('토마토소스')).toEqual(new Map([['슈퍼콤비네이션', '피자']]));
    expect(byCode.get('ING-GROUP')).toEqual(new Map([['치즈볼', '사이드']]));
    expect(byCode.get('ING-EDGE')).toEqual(
      new Map([
        ['슈퍼콤비네이션', '피자'],
        ['파생피자', '피자'],
      ])
    );
    expect(byCode.get('ING-DERIVED')).toEqual(new Map([['파생피자', '피자']]));
  });

  test('기존 pizza/personal/side 입력도 호환한다', () => {
    const { byCode } = buildIngredientUsageMap({
      pizzaRecs: [
        {
          menuCode: 'PZ-001-R',
          menuName: '오리지널 R',
          components: [{ productCode: 'ING-PIZZA', ingredientName: '피자재료' }],
        },
      ],
      personalRecs: [
        {
          menuCode: 'ONE-001',
          menuName: '1인피자',
          components: [{ productCode: 'ING-ONE', ingredientName: '1인재료' }],
        },
      ],
      sideRecs: [
        {
          menuCode: 'SIDE-001',
          menuName: '사이드',
          components: [{ productCode: 'ING-SIDE', ingredientName: '사이드재료' }],
        },
      ],
    });

    expect(byCode.get('ING-PIZZA')).toEqual(new Map([['오리지널', '피자']]));
    expect(byCode.get('ING-ONE')).toEqual(new Map([['1인피자', '1인피자']]));
    expect(byCode.get('ING-SIDE')).toEqual(new Map([['사이드', '사이드']]));
  });
});
