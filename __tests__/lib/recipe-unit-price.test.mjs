import { describe, expect, test } from '@jest/globals';
import { formatRecipeUnitPrice } from '../../lib/report/recipe-unit-price.js';
import { buildRecipePrintMenus } from '../../lib/report/recipe-print-rows.js';

describe('레시피 출력 식자재 단위당 원가', () => {
  test('g당·개당 단가를 읽기 쉬운 문구로 표시한다', () => {
    expect(formatRecipeUnitPrice(3.25, 'g')).toBe('g당 3.25원');
    expect(formatRecipeUnitPrice(450, '개')).toBe('개당 450원');
    expect(formatRecipeUnitPrice(null, 'g')).toBe('—');
  });

  test('L/R을 한 메뉴로 묶어도 식자재 단가와 단위를 유지한다', () => {
    const [menu] = buildRecipePrintMenus([
      {
        menuCode: 'P-001-L',
        menuName: '테스트 피자',
        categoryLabel: '피자',
        size: 'L',
        totalCost: 325,
        components: [
          {
            productCode: 'CHEESE',
            ingredientName: '치즈',
            quantity: 100,
            unit: 'g',
            unitPrice: 3.25,
            subtotal: 325,
          },
        ],
      },
    ]);

    expect(menu.components[0]).toMatchObject({ unit: 'g', unitPrice: 3.25 });
  });
});
