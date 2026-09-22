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
  test('직접·공통묶음·엣지·파생메뉴 모두 사용량에 포함하고 출처(sources)를 함께 담는다', () => {
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
        {
          menuCode: 'SIDE-001',
          menuName: '치즈볼',
          category: '사이드',
          components: [],
          selectedRecipeGroupIds: ['20'],
        },
      ],
      groups: [
        {
          id: 20,
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

    // 직접 레시피 구성품 — 포함, 출처는 직접
    expect(byCode.get('ING-SAUCE')).toEqual(
      new Map([['슈퍼콤비네이션', { category: '피자', sources: new Set(['직접']) }]])
    );
    expect(byName.get('토마토소스')).toEqual(
      new Map([['슈퍼콤비네이션', { category: '피자', sources: new Set(['직접']) }]])
    );
    // 공통묶음(묶음관리)으로만 연결 — 사용자 결정으로 이제 사용량에 포함(커밋 4391bc10 규칙 되돌림)
    expect(byCode.get('ING-GROUP')).toEqual(
      new Map([['치즈볼', { category: '사이드', sources: new Set(['묶음관리']) }]])
    );
    // 엣지(엣지관리)로만 연결 — 마찬가지로 포함(피자 카테고리 전체 메뉴에 적용되므로
    // 슈퍼콤비네이션 L·파생피자 둘 다 걸린다)
    expect(byCode.get('ING-EDGE')).toEqual(
      new Map([
        ['슈퍼콤비네이션', { category: '피자', sources: new Set(['엣지관리']) }],
        ['파생피자', { category: '피자', sources: new Set(['엣지관리']) }],
      ])
    );
    // 파생메뉴 연결 — 포함
    expect(byCode.get('ING-DERIVED')).toEqual(
      new Map([['파생피자', { category: '피자', sources: new Set(['파생메뉴']) }]])
    );
  });

  test('같은 메뉴를 여러 출처로 만나면 sources를 합집합으로 모은다', () => {
    const { byCode } = buildIngredientUsageMap({
      menuMasters: [{ menuCode: 'SIDE-001', menuName: '치즈볼', category: '사이드' }],
      detailRecipes: [
        {
          menuCode: 'SIDE-001',
          menuName: '치즈볼',
          category: '사이드',
          components: [{ productCode: 'ING-BOTH', ingredientName: '둘다' }],
          selectedRecipeGroupIds: ['20'],
        },
      ],
      groups: [
        {
          id: 20,
          name: '사이드 공통',
          defaultCategories: ['사이드'],
          ingredients: [{ productCode: 'ING-BOTH', ingredientName: '둘다' }],
        },
      ],
    });

    const entry = byCode.get('ING-BOTH')?.get('치즈볼');
    expect(entry.category).toBe('사이드');
    expect(entry.sources).toEqual(new Set(['직접', '묶음관리']));
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

    expect(byCode.get('ING-PIZZA')).toEqual(
      new Map([['오리지널', { category: '피자', sources: new Set(['직접']) }]])
    );
    expect(byCode.get('ING-ONE')).toEqual(
      new Map([['1인피자', { category: '1인피자', sources: new Set(['직접']) }]])
    );
    expect(byCode.get('ING-SIDE')).toEqual(
      new Map([['사이드', { category: '사이드', sources: new Set(['직접']) }]])
    );
  });

  test('메뉴마스터에서 단종된 메뉴는 레시피가 남아 있어도 사용 현황에 나오지 않는다', () => {
    const { byCode } = buildIngredientUsageMap({
      menuMasters: [
        { menuCode: 'S-001', menuName: '치즈볼', category: '사이드', status: 'active' },
        { menuCode: 'S-002', menuName: '핫윙', category: '사이드', status: 'discontinued' },
      ],
      detailRecipes: [
        {
          menuCode: 'S-001',
          menuName: '치즈볼',
          category: '사이드',
          components: [{ productCode: 'ING-OIL', ingredientName: '식용유' }],
        },
        {
          menuCode: 'S-002',
          menuName: '핫윙',
          category: '사이드',
          components: [
            { productCode: 'ING-OIL', ingredientName: '식용유' },
            { productCode: 'ING-WING', ingredientName: '닭날개' },
          ],
        },
      ],
    });

    expect([...byCode.get('ING-OIL').keys()]).toEqual(['치즈볼']);
    // 단종 메뉴에서만 쓰던 식자재는 사용 메뉴가 아예 없어야 한다(미사용으로 분류).
    expect(byCode.has('ING-WING')).toBe(false);
  });
});
