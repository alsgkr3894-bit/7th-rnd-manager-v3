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
