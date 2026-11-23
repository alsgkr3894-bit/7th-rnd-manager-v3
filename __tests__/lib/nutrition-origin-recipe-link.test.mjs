import { describe, expect, test } from '@jest/globals';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import {
  buildOriginMenuRows,
  buildOriginsFromIngredients,
} from '@/lib/nutrition/origin/build';

describe('메뉴마스터 레시피 → 원산지 출력 연결', () => {
  const ingredients = [
    {
      productCode: 'PEP-001',
      ingredientName: '페퍼로니',
      origin: [{ displayName: '돼지고기', country: '미국산' }],
    },
  ];
  const detailRecipes = tagDetailRecipes([], [], [], [], [
    {
      menuCode: 'T-001',
      menuName: '페퍼로니 추가',
      // 과거 수기 데이터처럼 식자재 마스터와 코드 대소문자가 다른 경우
      components: [{ productCode: 'pep-001', ingredientName: '페퍼로니' }],
    },
  ]);
  const mapData = buildIngredientMenuMap({ detailRecipes });

  test('추가토핑 레시피의 원산지가 메뉴별 화면에 표시된다', () => {
    const rows = buildOriginMenuRows(ingredients, mapData, () => false, [], {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      menuCode: 'T-001',
      menuName: '페퍼로니 추가',
      origins: [{ displayName: '돼지고기', country: '미국산' }],
    });
  });

  test('출력용 원산지 데이터에도 메뉴 연결이 보존된다', () => {
    const origins = buildOriginsFromIngredients(ingredients, mapData.ingredientToMenus);
    expect(origins[0].menuCodes).toEqual([
      expect.objectContaining({ menuCode: 'T-001', menuName: '페퍼로니 추가' }),
    ]);
  });
});
