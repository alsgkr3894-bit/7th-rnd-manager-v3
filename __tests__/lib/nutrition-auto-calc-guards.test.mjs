import { describe, expect, test } from '@jest/globals';
import {
  calcNutritionFromComponents,
  calcNutritionFromIngredientAmounts,
} from '@/lib/nutrition/auto-calc';

describe('calcNutritionFromComponents guards', () => {
  test('정상 재료는 기존 100g 기준 가중평균 수식으로 계산한다', () => {
    const nutritionMap = new Map([
      ['code:A', { kcal: 200, carbs: 10, sugar: 4, fat: 6, protein: 8, sodium: 100 }],
      ['name:밀가루', { kcal: 100, carbs: 20, sugar: 2, fat: 1, protein: 3, sodium: 50 }],
    ]);

    const result = calcNutritionFromComponents(
      [
        { productCode: 'A', ingredientName: '치즈', quantities: { L: 100 } },
        { ingredientName: '밀 가루', quantity: 100 },
      ],
      nutritionMap,
      'L'
    );

    expect(result).toMatchObject({
      totalGrams: 200,
      matched: 2,
      total: 2,
    });
    expect(result.values).toMatchObject({
      kcal: 150,
      carbs: 15,
      sugar: 3,
      fat: 3.5,
      protein: 5.5,
      sodium: 75,
    });
  });

  test('요청 사이즈가 없으면 기존처럼 다른 양수 사용량으로 폴백한다', () => {
    const nutritionMap = new Map([['code:A', { kcal: 100 }]]);

    const result = calcNutritionFromComponents(
      [{ productCode: 'A', quantities: { R: 50 } }],
      nutritionMap,
      'L'
    );

    expect(result).toMatchObject({
      totalGrams: 50,
      matched: 1,
      total: 1,
    });
    expect(result.values.kcal).toBe(100);
  });

  test('배열이나 Map이 아닌 입력은 계산하지 않고 null로 처리한다', () => {
    expect(calcNutritionFromComponents(null, new Map())).toBeNull();
    expect(calcNutritionFromComponents([{ productCode: 'A', quantity: 10 }], {})).toBeNull();
    expect(
      calcNutritionFromComponents(['bad', null], new Map([['code:A', { kcal: 1 }]]))
    ).toBeNull();
  });

  test('직접 입력한 L/R 식자재 용량은 요청 사이즈만 사용해 계산한다', () => {
    const nutritionMap = new Map([
      ['code:A', { kcal: 200, protein: 10 }],
      ['code:B', { kcal: 100, protein: 4 }],
    ]);
    const rows = [
      { productCode: 'A', ingredientName: '치즈', lAmount: 100, rAmount: 50 },
      { productCode: 'B', ingredientName: '소스', lAmount: 100, rAmount: 0 },
    ];

    const lResult = calcNutritionFromIngredientAmounts(rows, nutritionMap, 'L');
    expect(lResult).toMatchObject({
      totalGrams: 200,
      matched: 2,
    });
    expect(lResult.values).toMatchObject({
      kcal: 150,
      protein: 7,
    });

    const rResult = calcNutritionFromIngredientAmounts(rows, nutritionMap, 'R');
    expect(rResult).toMatchObject({
      totalGrams: 50,
      matched: 1,
    });
    expect(rResult.values).toMatchObject({
      kcal: 200,
      protein: 10,
    });
  });

  test('직접 입력 계산은 반대 사이즈 용량으로 폴백하지 않는다', () => {
    const nutritionMap = new Map([['code:A', { kcal: 200 }]]);

    expect(
      calcNutritionFromIngredientAmounts(
        [{ productCode: 'A', ingredientName: '치즈', lAmount: 100 }],
        nutritionMap,
        'R'
      )
    ).toBeNull();
  });
});
