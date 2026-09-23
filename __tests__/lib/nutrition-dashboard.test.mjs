/**
 * 영양 대시보드 요약 집계.
 *
 * 회귀 방지(2026-09-23): 원산지 커버리지가 비어 있는 레거시 store
 * (nutrition_origin_master)를 기준으로 세는 바람에, 식자재에 원산지를 실제로 입력해도
 * "원산지 미등록"으로 잡혔다. 알레르기와 같이 cost_ingredients.origin이 단일 출처다.
 */
import { describe, expect, jest, test } from '@jest/globals';

const ingredients = [
  { id: 1, ingredientName: '베이컨', origin: [{ displayName: '돼지고기', country: '미국산' }] },
  { id: 2, ingredientName: '페페로니', origin: [{ displayName: '돼지고기', country: '국내산' }] },
  { id: 3, ingredientName: '양파', originNone: true },
  { id: 4, ingredientName: '까망베르치즈', originHidden: true, origin: [] },
  { id: 5, ingredientName: '웨지감자' }, // 진짜 미등록
  { id: 6, ingredientName: '단종재료', discontinued: true }, // 집계 제외
];

jest.unstable_mockModule('@/lib/nutrition/values/store', () => ({
  getAllMenuRefs: async () => [{ menuCode: 'P-001' }, { menuCode: 'P-002' }],
  getAllRawValues: async () => [{ menuCode: 'P-001' }],
}));
jest.unstable_mockModule('../../lib/nutrition/values/store.js', () => ({
  getAllMenuRefs: async () => [{ menuCode: 'P-001' }, { menuCode: 'P-002' }],
  getAllRawValues: async () => [{ menuCode: 'P-001' }],
}));
jest.unstable_mockModule('@/lib/ingredient', () => ({
  getAllIngredients: async () => ingredients,
}));
jest.unstable_mockModule('../../lib/ingredient/index.js', () => ({
  getAllIngredients: async () => ingredients,
}));

const { getNutritionDashboard } = await import('../../lib/nutrition/dashboard.js');

describe('getNutritionDashboard', () => {
  test('원산지 미등록은 식자재 origin 배열 기준 — 입력분·출력제외분은 세지 않는다', async () => {
    const d = await getNutritionDashboard();
    // 활성 5건 중 origin 있음 2 + originNone 1 + originHidden 1 = 4건이 커버됨
    expect(d.originMissing).toBe(1);
  });

  test('영양 입력률은 rawValues에 코드가 있는 메뉴 기준', async () => {
    const d = await getNutritionDashboard();
    expect(d.menuCount).toBe(2);
    expect(d.nutritionDone).toBe(1);
    expect(d.nutritionRate).toBe(50);
  });
});
