import { describe, expect, test } from '@jest/globals';
import {
  buildMenuRecipeSummaryMap,
  componentEffectiveUnitPrice,
  MENU_RECIPE_SUMMARY_STATUS,
  recipeKindForMenu,
  summarizeMenuRecipe,
} from '../../lib/menu-master/recipe-summary.js';

describe('menu master recipe summary', () => {
  test('메뉴 카테고리별 원가 레시피 저장소 종류를 판정한다', () => {
    expect(recipeKindForMenu({ category: '피자/오리지널' })).toBe('pizza');
    expect(recipeKindForMenu({ category: '1인피자' })).toBe('personal');
    expect(recipeKindForMenu({ category: '세트박스' })).toBe('set');
    expect(recipeKindForMenu({ category: '사이드' })).toBe('side');
    expect(recipeKindForMenu({ category: '음료' })).toBe('side');
    expect(recipeKindForMenu({ category: '엣지' })).toBeNull();
    // 소스·파스타 카테고리도 side 계열로 라우팅된다
    expect(recipeKindForMenu({ category: '소스' })).toBe('side');
    expect(recipeKindForMenu({ category: '파스타' })).toBe('side');
  });

  test('제품코드가 있으면 저장된 단가보다 최신 단가 맵을 우선한다', () => {
    const unitPriceMap = new Map([['CHZ', { unitPrice: 12.3, baseUnitType: 'g' }]]);

    expect(componentEffectiveUnitPrice({ productCode: 'CHZ', unitPrice: 999 }, unitPriceMap)).toBe(
      12.3
    );

    const summary = summarizeMenuRecipe(
      { menuCode: 'P-OR-001-L', category: '피자', price: 10000 },
      {
        components: [{ productCode: 'CHZ', ingredientName: '치즈', quantity: 100, unitPrice: 999 }],
      },
      unitPriceMap
    );

    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.READY,
      hasRecipe: true,
      componentCount: 1,
      totalCost: 1230,
      missingPriceCount: 0,
      missingQuantityCount: 0,
    });
    expect(summary.costRate).toBe(12.3);
  });

  test('메뉴에서 체크한 공통묶음만 메뉴마스터 요약에 포함한다', () => {
    const unitPriceMap = new Map([
      ['CHZ', { unitPrice: 5, baseUnitType: 'g' }],
      ['SAUCE', { unitPrice: 10, baseUnitType: 'g' }],
    ]);

    const summary = summarizeMenuRecipe(
      { menuCode: 'P-OR-001-L', category: '피자/오리지널', size: 'L', price: 10000 },
      {
        components: [{ productCode: 'CHZ', ingredientName: '치즈', quantity: 100 }],
        selectedRecipeGroupIds: ['10'],
      },
      unitPriceMap,
      {
        recipeGroups: [
          {
            id: 10,
            name: '피자 공통',
            sizes: ['L', 'R'],
            defaultCategories: ['피자'],
            ingredients: [
              {
                productCode: 'SAUCE',
                ingredientName: '공통소스',
                quantities: { L: 30, R: 20 },
                unitType: 'g',
              },
            ],
          },
        ],
      }
    );

    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.READY,
      hasRecipe: true,
      componentCount: 2,
      directComponentCount: 1,
      commonComponentCount: 1,
      commonGroupCount: 1,
      totalCost: 800,
      missingPriceCount: 0,
      missingQuantityCount: 0,
    });
    expect(summary.costRate).toBe(8);
  });

  test('공통묶음을 체크하지 않으면 카테고리가 맞아도 자동 포함하지 않는다', () => {
    const summary = summarizeMenuRecipe(
      { menuCode: 'P-OR-001-L', category: '피자/오리지널', size: 'L', price: 10000 },
      { components: [{ productCode: 'CHZ', ingredientName: '치즈', quantity: 100 }] },
      new Map([
        ['CHZ', { unitPrice: 5, baseUnitType: 'g' }],
        ['SAUCE', { unitPrice: 10, baseUnitType: 'g' }],
      ]),
      {
        recipeGroups: [
          {
            id: 10,
            name: '피자 공통',
            sizes: ['L'],
            defaultCategories: ['피자'],
            ingredients: [
              {
                productCode: 'SAUCE',
                ingredientName: '공통소스',
                quantities: { L: 30 },
              },
            ],
          },
        ],
      }
    );

    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.READY,
      componentCount: 1,
      directComponentCount: 1,
      commonComponentCount: 0,
      commonGroupCount: 0,
      totalCost: 500,
    });
  });

  test('직접 레시피가 완성되어도 공통묶음 해당 사이즈 수량이 없으면 공통 수량 누락으로 분리한다', () => {
    const summary = summarizeMenuRecipe(
      { menuCode: 'P-OR-001-L', category: '피자/오리지널', size: 'L', price: 10000 },
      {
        components: [{ productCode: 'CHZ', ingredientName: '치즈', quantity: 100 }],
        selectedRecipeGroupIds: ['10'],
      },
      new Map([
        ['CHZ', { unitPrice: 5, baseUnitType: 'g' }],
        ['SAUCE', { unitPrice: 10, baseUnitType: 'g' }],
      ]),
      {
        recipeGroups: [
          {
            id: 10,
            name: '피자 공통',
            sizes: ['L'],
            defaultCategories: ['피자'],
            ingredients: [
              {
                productCode: 'SAUCE',
                ingredientName: '공통소스',
                quantities: {},
              },
            ],
          },
        ],
      }
    );

    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY,
      missingQuantityCount: 1,
      missingDirectQuantityCount: 0,
      missingCommonQuantityCount: 1,
      missingPriceCount: 0,
      missingDirectPriceCount: 0,
      missingCommonPriceCount: 0,
    });
  });

  test('직접 구성품이 없어도 체크한 공통묶음만으로 메뉴 원가를 표시한다', () => {
    const result = buildMenuRecipeSummaryMap(
      [{ menuCode: 'P-OR-002-R', category: '피자/오리지널', size: 'R', price: 12000 }],
      {
        pizza: new Map([
          [
            'P-OR-002-R',
            {
              menuCode: 'P-OR-002-R',
              category: '피자/오리지널',
              size: 'R',
              components: [],
              selectedRecipeGroupIds: ['11'],
            },
          ],
        ]),
      },
      new Map([['SAUCE', { unitPrice: 10, baseUnitType: 'g' }]]),
      {
        recipeGroups: [
          {
            id: 11,
            name: '피자 R 공통',
            sizes: ['R'],
            defaultCategories: ['피자'],
            ingredients: [
              {
                productCode: 'SAUCE',
                ingredientName: '공통소스',
                quantities: { R: 25 },
              },
            ],
          },
        ],
      }
    );

    expect(result.get('P-OR-002-R')).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.READY,
      hasRecipe: true,
      componentCount: 1,
      directComponentCount: 0,
      commonComponentCount: 1,
      commonGroupCount: 1,
      totalCost: 250,
    });
  });

  test('negative common group quantity is treated as a valid deduction', () => {
    const summary = summarizeMenuRecipe(
      { menuCode: 'P-OR-003-L', category: '피자/오리지널', size: 'L', price: 10000 },
      {
        components: [{ productCode: 'DOUGH', ingredientName: '도우', quantity: 100 }],
        selectedRecipeGroupIds: ['12'],
      },
      new Map([
        ['DOUGH', { unitPrice: 5, baseUnitType: 'g' }],
        ['SAUCE', { unitPrice: 10, baseUnitType: 'g' }],
      ]),
      {
        recipeGroups: [
          {
            id: 12,
            name: '피자 차감 공통',
            sizes: ['L'],
            defaultCategories: ['피자'],
            ingredients: [
              {
                productCode: 'SAUCE',
                ingredientName: '차감소스',
                quantities: { L: -20 },
              },
            ],
          },
        ],
      }
    );

    expect(summary).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.READY,
      totalCost: 300,
      missingQuantityCount: 0,
      missingCommonQuantityCount: 0,
    });
  });

  test('수량과 단가 누락을 요약 상태로 표시한다', () => {
    const summary = summarizeMenuRecipe(
      { menuCode: 'P-OR-002-L', category: '피자', price: 20000 },
      {
        components: [
          { productCode: 'NO-PRICE', ingredientName: '미등록', quantity: '' },
          { productCode: '', ingredientName: '수동입력', quantity: 10, unitPrice: 2.5 },
        ],
      },
      new Map()
    );

    expect(summary.status).toBe(MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY);
    expect(summary.totalCost).toBe(25);
    expect(summary.missingPriceCount).toBe(1);
    expect(summary.missingQuantityCount).toBe(1);
  });

  test('메뉴 목록을 저장소별 레시피 맵과 합쳐 메뉴코드 기준 요약 맵으로 만든다', () => {
    const unitPriceMap = new Map([['DOUGH', { unitPrice: 3, baseUnitType: 'g' }]]);
    const result = buildMenuRecipeSummaryMap(
      [
        { menuCode: 'P-OR-001-L', category: '피자', price: 15000 },
        { menuCode: 'ET-001', category: '엣지', price: 3000 },
      ],
      {
        pizza: new Map([
          [
            'P-OR-001-L',
            {
              menuCode: 'P-OR-001-L',
              components: [{ productCode: 'DOUGH', ingredientName: '도우', quantity: 200 }],
            },
          ],
        ]),
      },
      unitPriceMap
    );

    expect(result.get('P-OR-001-L')).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.READY,
      totalCost: 600,
      componentCount: 1,
    });
    expect(result.get('ET-001')).toMatchObject({
      status: MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED,
      hasRecipe: false,
    });
  });
});
