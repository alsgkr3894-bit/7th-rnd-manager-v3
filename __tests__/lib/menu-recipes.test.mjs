import { describe, expect, test } from '@jest/globals';
import {
  buildMenuRecipeRecord,
  normalizeMenuRecipeComponents,
  normalizeSelectedRecipeGroupIds,
  recipeKindForRecord,
} from '../../lib/menu-recipes/store.js';
import { mergeCanonicalRecipeMaps, recipeArraysFromMaps } from '../../lib/menu-recipes/legacy.js';

describe('menu recipes canonical store helpers', () => {
  test('레시피 구성품을 g/개 기준으로 정규화하고 빈 행은 제외한다', () => {
    expect(
      normalizeMenuRecipeComponents([
        {
          productCode: ' ING-1 ',
          ingredientName: ' 치즈 ',
          quantity: '10.5',
          unit: 'kg',
          unitPrice: '12.3',
          note: ' memo ',
        },
        {
          productCode: '',
          ingredientName: '',
          quantity: '',
          unit: '',
          unitPrice: '',
        },
        {
          productCode: 'ING-2',
          ingredientName: '피클',
          quantity: '2',
          unit: 'ea',
          unitPrice: '50',
        },
      ])
    ).toEqual([
      {
        productCode: 'ING-1',
        ingredientName: '치즈',
        quantity: 10.5,
        unit: 'g',
        unitPrice: 12.3,
        note: 'memo',
      },
      {
        productCode: 'ING-2',
        ingredientName: '피클',
        quantity: 2,
        unit: '개',
        unitPrice: 50,
        note: '',
      },
    ]);
  });

  test('레시피 구성품의 잘못된 숫자는 NaN 대신 null로 저장한다', () => {
    expect(
      normalizeMenuRecipeComponents([
        {
          productCode: 'ING-BAD',
          ingredientName: '잘못된 숫자',
          quantity: 'abc',
          unitPrice: '12x',
        },
      ])
    ).toEqual([
      {
        productCode: 'ING-BAD',
        ingredientName: '잘못된 숫자',
        quantity: null,
        unit: 'g',
        unitPrice: null,
        note: '',
      },
    ]);
  });

  test('레시피 구성품의 음수 수량/단가는 null로 저장한다', () => {
    expect(
      normalizeMenuRecipeComponents([
        {
          productCode: 'ING-NEG',
          ingredientName: '음수 방어',
          quantity: '-1',
          unitPrice: '-20',
        },
      ])
    ).toEqual([
      {
        productCode: 'ING-NEG',
        ingredientName: '음수 방어',
        quantity: null,
        unit: 'g',
        unitPrice: null,
        note: '',
      },
    ]);
  });

  test('메뉴 레시피 레코드는 menuCode 기준 displayGroupKey와 카테고리 kind를 만든다', () => {
    const record = buildMenuRecipeRecord({
      menuCode: ' P-OR-001-L ',
      menuName: ' 테스트피자 ',
      category: '피자/오리지널',
      size: 'L',
      components: [{ ingredientName: '도우', quantity: '100', unitPrice: '2' }],
      selectedRecipeGroupIds: [10, ' 20 ', 10, null],
    });

    expect(record).toMatchObject({
      brandId: 'main',
      menuCode: 'P-OR-001-L',
      displayGroupKey: 'P-OR-001-L',
      menuName: '테스트피자',
      category: '피자/오리지널',
      kind: 'pizza',
      size: 'L',
      source: 'menu-recipes',
    });
    expect(record.components).toHaveLength(1);
    expect(record.selectedRecipeGroupIds).toEqual(['10', '20']);
    expect(recipeKindForRecord(record)).toBe('pizza');
  });

  test('선택한 공통묶음 id는 문자열 기준으로 정규화하고 중복 제거한다', () => {
    expect(normalizeSelectedRecipeGroupIds([10, ' 10 ', '20', '', null, undefined])).toEqual([
      '10',
      '20',
    ]);
  });

  test('canonical menu_recipes만 카테고리별 map으로 변환한다', () => {
    const maps = mergeCanonicalRecipeMaps([
      {
        menuCode: 'P-OR-001-L',
        menuName: '새 피자',
        category: '피자',
        kind: 'pizza',
        components: [{ ingredientName: '새 도우' }],
      },
    ]);

    expect(maps.pizza.get('P-OR-001-L').components[0].ingredientName).toBe('새 도우');
    expect(maps.side).toBeInstanceOf(Map);
    expect(recipeArraysFromMaps(maps).pizza).toHaveLength(1);
  });

  test('화면 호환용 배열 구조로 recipe map을 변환한다', () => {
    const arrays = recipeArraysFromMaps({
      pizza: new Map([['P-OR-001-L', { menuCode: 'P-OR-001-L' }]]),
      side: new Map([['S-001', { menuCode: 'S-001' }]]),
    });

    expect(arrays.pizza).toEqual([{ menuCode: 'P-OR-001-L' }]);
    expect(arrays.personal).toEqual([]);
    expect(arrays.side).toEqual([{ menuCode: 'S-001' }]);
    expect(arrays.set).toEqual([]);
  });
});
