import { describe, expect, test } from '@jest/globals';
import {
  buildIngredientByKey,
  filterAllergenIngredients,
  filterIngredientRows,
  filterMenuMatrix,
  orderAllergens,
} from '@/app/nutrition/allergen/allergenPageDataUtils';
import {
  buildAllergenCsvRows,
  buildAllergenListForOrder,
  buildMenuListForOrder,
  buildMenuNameEditMenus,
} from '@/app/nutrition/allergen/allergenPageOutputUtils';

describe('allergen page data utils', () => {
  const ingredients = [
    { productCode: 'EGG', ingredientName: '계란액', allergens: ['AL01'] },
    { productCode: 'MILK', ingredientName: '모짜렐라치즈', allergens: ['AL02'] },
    { productCode: 'NONE', ingredientName: '소금', allergens: [] },
    { productCode: 'OLD', ingredientName: '단종치즈', allergens: ['AL02'], discontinued: true },
    { productCode: 'EXC', ingredientName: '제외계란', allergens: ['AL01'], excluded: true },
  ];

  test('filterAllergenIngredients excludes empty, discontinued, and excluded ingredients', () => {
    expect(filterAllergenIngredients(ingredients).map(row => row.productCode)).toEqual([
      'EGG',
      'MILK',
    ]);
  });

  test('filterIngredientRows matches ingredient name, product code, and allergen name', () => {
    const rows = filterAllergenIngredients(ingredients);

    expect(filterIngredientRows(rows, '치즈').map(row => row.productCode)).toEqual(['MILK']);
    expect(filterIngredientRows(rows, 'egg').map(row => row.productCode)).toEqual(['EGG']);
    expect(filterIngredientRows(rows, '우유').map(row => row.productCode)).toEqual(['MILK']);
  });

  test('orderAllergens uses saved order first and frequency fallback next', () => {
    expect(orderAllergens(['AL02', 'AL01'], [])[0].allergenCode).toBe('AL02');

    const orderedByFrequency = orderAllergens(
      [],
      [{ allergenCodes: new Set(['AL02']) }, { allergenCodes: new Set(['AL01', 'AL02']) }]
    );
    expect(orderedByFrequency[0].allergenCode).toBe('AL02');
  });

  test('matrix helpers build order lists, menu edit targets, and search filters', () => {
    const matrixRows = [
      {
        menuCode: 'P-001',
        menuName: '치즈 피자',
        originalMenuName: '치즈 피자',
        crust: '석쇠',
        allergenCodes: new Set(['AL02']),
      },
      {
        menuCode: 'P-001',
        menuName: '치즈 피자',
        originalMenuName: '치즈 피자',
        crust: '씬바샤삭',
        allergenCodes: new Set(['AL01']),
      },
      {
        menuCode: 'S-001',
        menuName: '치킨',
        originalMenuName: '치킨',
        crust: '',
        allergenCodes: new Set(['AL01']),
      },
    ];

    const menuList = buildMenuListForOrder(matrixRows);
    expect(menuList).toEqual([
      { key: 'P-001', label: '치즈 피자' },
      { key: 'S-001', label: '치킨' },
    ]);
    expect(buildMenuNameEditMenus(menuList)).toEqual([
      { menuCode: 'P-001', menuName: '치즈 피자' },
      { menuCode: 'S-001', menuName: '치킨' },
    ]);
    expect(filterMenuMatrix(matrixRows, '씬').map(row => row.crust)).toEqual(['씬바샤삭']);
    expect(filterMenuMatrix(matrixRows, '우유').map(row => row.menuCode)).toEqual(['P-001']);
  });

  test('list and csv helpers preserve allergen labels and bullet cells', () => {
    const orderedAllergens = orderAllergens(['AL02', 'AL01'], []);
    expect(buildAllergenListForOrder(orderedAllergens).slice(0, 2)).toEqual([
      { key: 'AL02', label: '우유' },
      { key: 'AL01', label: '계란' },
    ]);

    expect(
      buildAllergenCsvRows(
        [{ menuName: '치즈 피자', crust: '석쇠', allergenCodes: new Set(['AL02']) }],
        orderedAllergens.slice(0, 2)
      )
    ).toEqual([
      ['메뉴명', '크러스트', '우유', '계란'],
      ['치즈 피자', '석쇠', '●', ''],
    ]);
  });

  test('buildIngredientByKey supports product code and normalized name lookup', () => {
    const map = buildIngredientByKey(filterAllergenIngredients(ingredients));

    expect(map.get('code:MILK')?.ingredientName).toBe('모짜렐라치즈');
    expect(map.get('name:모짜렐라치즈')?.productCode).toBe('MILK');
  });
});
