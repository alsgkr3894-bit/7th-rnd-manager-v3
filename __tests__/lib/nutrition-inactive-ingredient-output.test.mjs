import { describe, expect, test } from '@jest/globals';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { buildMenuAllergenMap } from '@/lib/nutrition/allergen/aggregate';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { filterAllergenIngredients } from '@/app/nutrition/allergen/allergenPageDataUtils';
import {
  buildOriginMenuRows,
  buildOriginsFromIngredients,
  filterOriginOutputIngredients,
} from '@/lib/nutrition/origin/build';

const ing = (productCode, ingredientName, country, allergens, extra = {}) => ({
  productCode,
  ingredientName,
  allergens,
  origin: [{ displayName: ingredientName, country }],
  ...extra,
});

const recipeMap = components =>
  buildIngredientMenuMap({
    menuMasters: [{ menuCode: 'S-001', menuName: '치즈볼', category: '사이드' }],
    detailRecipes: [{ menuCode: 'S-001', menuName: '치즈볼', category: '사이드', components }],
  }).ingredientToMenus;

const originCountries = (ingredients, ingredientToMenus) =>
  buildOriginMenuRows(
    filterOriginOutputIngredients(ingredients, ingredientToMenus, () => false),
    { ingredientToMenus },
    () => false,
    [],
    {}
  ).flatMap(row => row.origins.map(origin => origin.country));

describe('단종·제외 식자재의 알레르기·원산지 표시', () => {
  test('레시피에 남아 있으면 모든 출력에 나온다', () => {
    const ingredients = [ing('OLD', '단종치즈', '미국', ['AL02'], { discontinued: true })];
    const map = recipeMap([{ productCode: 'OLD', ingredientName: '단종치즈' }]);

    expect([...buildMenuAllergenMap({ ingredients, ingredientToMenus: map }).get('S-001')]).toEqual(
      ['AL02']
    );
    const [row] = buildMenuMatrix(
      filterAllergenIngredients(ingredients),
      { ingredientToMenus: map },
      [],
      () => false,
      [],
      {},
      []
    );
    expect([...row.allergenCodes]).toEqual(['AL02']);
    expect(originCountries(ingredients, map)).toEqual(['미국']);
    expect(buildOriginsFromIngredients(ingredients, map)).toHaveLength(1);
  });

  test('레시피에서 빠졌으면 원산지 목록에 나오지 않는다', () => {
    const ingredients = [ing('OLD', '단종치즈', '미국', ['AL02'], { excluded: true })];
    const map = recipeMap([{ productCode: 'NEW', ingredientName: '새치즈' }]);

    expect(buildOriginsFromIngredients(ingredients, map)).toEqual([]);
    expect(filterOriginOutputIngredients(ingredients, map, () => false)).toEqual([]);
  });

  test('이름이 같은 대체 식자재가 쓰이면 단종 식자재의 정보가 섞이지 않는다', () => {
    const ingredients = [
      // 목록 순서와 무관하게 사용 중 식자재가 이름을 가진다.
      ing('NEW', '치즈', '뉴질랜드', ['AL02']),
      ing('OLD', '치즈', '미국', ['AL04'], { discontinued: true }),
    ];
    const map = recipeMap([{ productCode: 'NEW', ingredientName: '치즈' }]);

    for (const list of [ingredients, [...ingredients].reverse()]) {
      expect([
        ...buildMenuAllergenMap({ ingredients: list, ingredientToMenus: map }).get('S-001'),
      ]).toEqual(['AL02']);
      expect(originCountries(list, map)).toEqual(['뉴질랜드']);
      expect(buildOriginsFromIngredients(list, map).map(o => o.items[0].country)).toEqual([
        '뉴질랜드',
      ]);
    }
  });

  test('사용 중 식자재에 알레르기가 없어도 같은 이름의 단종 값을 가져오지 않는다', () => {
    const ingredients = [
      ing('NEW', '소스', '국산', []),
      ing('OLD', '소스', '미국', ['AL04'], { discontinued: true }),
    ];
    const map = recipeMap([{ productCode: 'NEW', ingredientName: '소스' }]);

    expect(buildMenuAllergenMap({ ingredients, ingredientToMenus: map }).size).toBe(0);
    const rows = buildMenuMatrix(
      filterAllergenIngredients(ingredients),
      { ingredientToMenus: map },
      [],
      () => false,
      [],
      {},
      []
    );
    expect(rows.flatMap(row => [...row.allergenCodes])).toEqual([]);
  });
});
