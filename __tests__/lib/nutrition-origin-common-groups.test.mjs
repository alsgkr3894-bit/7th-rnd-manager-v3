import { describe, expect, test } from '@jest/globals';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { buildOriginMenuRows } from '@/lib/nutrition/origin/build';

describe('nutrition origin common recipe groups', () => {
  test('공통묶음 재료의 원산지도 적용 카테고리 메뉴에 집계된다', () => {
    const originIngredients = [
      {
        productCode: 'COMMON-SAUCE',
        ingredientName: '공통소스',
        origin: [{ displayName: '토마토소스', country: '국내산' }],
      },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [
        { menuCode: 'P-OR-003-L', menuName: '공통 테스트 L', category: '피자/오리지널' },
        { menuCode: 'S-CHK-001', menuName: '치킨텐더', category: '사이드' },
      ],
      groups: [
        {
          id: 10,
          name: '피자 공통',
          defaultCategories: ['피자'],
          ingredients: [{ productCode: 'COMMON-SAUCE', ingredientName: '공통소스' }],
        },
      ],
    });

    const rows = buildOriginMenuRows(originIngredients, mapData, () => false, [], {});

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      menuCode: 'P-OR-003-L',
      menuName: '공통 테스트 L',
      category: '피자/오리지널',
      origins: [{ displayName: '토마토소스', country: '국내산' }],
    });
  });
});
