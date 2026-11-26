/**
 * 점검 1단계 회귀: 같은 식자재·레시피로 만든 알레르기·원산지가 입력 화면(매트릭스·메뉴별 보기),
 * 출력(영양성분표·원산지 표시), 출시 준비 점검에서 서로 어긋나지 않는지 확인한다.
 */
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
import { buildNutritionOutputCoverage } from '@/lib/menu-master/readiness-coverage';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';

const menus = [
  { menuCode: 'S-001', menuName: '치즈볼', category: '사이드' },
  { menuCode: 'S-002', menuName: '공산품 음료', category: '사이드' },
  { menuCode: 'S-003', menuName: '단종 메뉴', category: '사이드', status: 'discontinued' },
];

const ingredients = [
  {
    productCode: 'CHZ',
    ingredientName: '치즈',
    allergens: ['AL02'],
    origin: [{ displayName: '치즈', country: '미국산' }],
  },
  // 레시피에 남은 단종 식자재
  {
    productCode: 'OLD',
    ingredientName: '옛 베이컨',
    discontinued: true,
    allergens: ['AL06'],
    origin: [{ displayName: '돼지고기', country: '칠레산' }],
  },
  // 공통묶음으로 들어오는 식자재
  {
    productCode: 'OIL',
    ingredientName: '튀김유',
    allergens: ['AL05'],
    origin: [{ displayName: '대두', country: '국내산' }],
  },
  { productCode: 'CAN', ingredientName: '캔음료', temperature: '공산품' },
];

const sideRecipes = [
  {
    menuCode: 'S-001',
    menuName: '치즈볼',
    category: '사이드',
    selectedRecipeGroupIds: ['G1'],
    components: [
      { productCode: 'CHZ', ingredientName: '치즈' },
      { productCode: 'OLD', ingredientName: '옛 베이컨' },
    ],
  },
  {
    menuCode: 'S-002',
    menuName: '공산품 음료',
    category: '사이드',
    components: [{ productCode: 'CAN', ingredientName: '캔음료' }],
  },
  {
    menuCode: 'S-003',
    menuName: '단종 메뉴',
    category: '사이드',
    components: [{ productCode: 'CHZ', ingredientName: '치즈' }],
  },
];

const groups = [
  {
    id: 'G1',
    name: '튀김',
    defaultCategories: ['사이드'],
    ingredients: [{ productCode: 'OIL', ingredientName: '튀김유' }],
  },
];

describe('알레르기·원산지 연결 회귀', () => {
  const { ingredientToMenus } = buildIngredientMenuMap({
    menuMasters: menus,
    detailRecipes: sideRecipes,
    groups,
  });
  const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(menus);
  const isExcluded = (code, name) => excludedMenuCodes.has(code) || excludedMenuNames.has(name);

  test('알레르기: 매트릭스와 영양성분표가 같고 단종 메뉴는 없다', () => {
    const screen = buildMenuMatrix(
      filterAllergenIngredients(ingredients),
      { ingredientToMenus },
      [],
      isExcluded,
      [],
      {},
      [],
      menus
    );
    const label = buildMenuAllergenMap({ ingredients, ingredientToMenus });
    const row = screen.find(item => item.menuCode === 'S-001');

    expect([...row.allergenCodes].sort()).toEqual(['AL02', 'AL05', 'AL06']);
    expect([...label.get('S-001')].sort()).toEqual(['AL02', 'AL05', 'AL06']);
    expect(screen.map(item => item.menuCode)).not.toContain('S-003');
  });

  test('원산지: 메뉴별 보기와 출력 목록이 같다', () => {
    const expected = ['국내산', '미국산', '칠레산'];
    const screen = buildOriginMenuRows(
      filterOriginOutputIngredients(ingredients, ingredientToMenus, isExcluded),
      { ingredientToMenus },
      isExcluded,
      [],
      {}
    );
    const output = buildOriginsFromIngredients(
      ingredients,
      ingredientToMenus,
      excludedMenuCodes,
      excludedMenuNames
    );

    expect(
      screen
        .find(row => row.menuCode === 'S-001')
        .origins.map(origin => origin.country)
        .sort()
    ).toEqual(expected);
    expect(
      output
        .filter(item => item.menuCodes.some(menu => menu.menuCode === 'S-001'))
        .flatMap(item => item.items.map(origin => origin.country))
        .sort()
    ).toEqual(expected);
    expect(output.flatMap(item => item.menuCodes.map(menu => menu.menuCode))).not.toContain(
      'S-003'
    );
  });

  test('출시 준비 점검은 출력이 있는 메뉴와 표시 의무가 없는 메뉴를 누락으로 세지 않는다', () => {
    const coverage = buildNutritionOutputCoverage({
      menus,
      ingredients,
      groups,
      edges: [],
      recipeArrays: { side: sideRecipes },
    });

    for (const code of ['S-001', 'S-002']) {
      expect(coverage.originReadyCodes.has(code)).toBe(true);
      expect(coverage.allergenReadyCodes.has(code)).toBe(true);
    }
  });
});
