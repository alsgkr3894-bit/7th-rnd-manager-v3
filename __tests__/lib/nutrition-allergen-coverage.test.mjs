import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { buildAllergenCoverageWarnings } from '../../lib/nutrition/allergen/coverage.js';

const ingredients = [
  { productCode: 'CC410251', ingredientName: '고르곤졸라치즈', allergens: ['AL02'] },
  { productCode: 'CC121678', ingredientName: '파슬리', allergens: [] },
  { productCode: 'CC999', ingredientName: '단종치즈', allergens: ['AL02'], discontinued: true },
];
const masterByCode = {
  'P-OR-009': { category: '피자/오리지널' },
  'P-ONE-004': { category: '1인피자' },
  'D-CC-001-355': { category: '음료' },
};
const menus = [
  { menuCode: 'P-OR-009', menuName: '고르곤졸라 피자', category: '피자' },
  { menuCode: 'P-ONE-004', menuName: '고르곤졸라 (1인용)', category: '피자' },
  { menuCode: 'D-CC-001-355', menuName: '코카콜라355ml', category: '음료' },
];

describe('buildAllergenCoverageWarnings — 알레르기 자동 집계에서 조용히 빠지는 항목', () => {
  test('레시피 없는 메뉴, 식자재 마스터에 없는 구성품, 도우 미설정을 각각 잡아낸다', () => {
    const w = buildAllergenCoverageWarnings({
      menus,
      masterByCode,
      ingredients,
      detailRecipes: [
        {
          menuCode: 'P-OR-009-L',
          components: [
            { productCode: 'CC411436', ingredientName: '까망베르슈레드치즈' }, // 마스터에 없음
            { productCode: 'CC410251', ingredientName: '고르곤졸라치즈' },
            { productCode: 'CC121678', ingredientName: '파슬리' }, // 알레르기 비어 있음(참고)
            { productCode: 'CC999', ingredientName: '단종치즈' }, // 단종이어도 "존재"로 본다
          ],
        },
      ],
      costEdges: [],
    });
    expect(w.menusWithoutRecipe).toEqual([
      { menuCode: 'P-ONE-004', menuName: '고르곤졸라 (1인용)' },
    ]);
    expect(w.unmatchedComponents).toEqual([
      { productCode: 'CC411436', ingredientName: '까망베르슈레드치즈', menuCodes: ['P-OR-009'] },
    ]);
    expect(w.componentsWithoutAllergens.map(c => c.ingredientName)).toEqual(['파슬리']);
    expect(w.doughNotConfigured).toBe(true);
    expect(w.pizzaMenuCount).toBe(2);
    // 음료는 레시피가 없어도 세지 않는다
    expect(w.menusWithoutRecipe.some(m => m.menuCode === 'D-CC-001-355')).toBe(false);
    expect(w.total).toBe(3); // 레시피 없음 1 + 미매칭 구성품 1 + 도우 1
  });

  test('레시피는 베이스 코드(L/R 접미사 제거)로 메뉴와 연결한다', () => {
    const w = buildAllergenCoverageWarnings({
      menus: [menus[0]],
      masterByCode,
      ingredients,
      detailRecipes: [{ menuCode: 'P-OR-009-R', components: [{ productCode: 'CC410251' }] }],
      costEdges: [{ edgeType: '씬도우', size: 'L', components: [] }],
    });
    expect(w.menusWithoutRecipe).toEqual([]);
    expect(w.unmatchedComponents).toEqual([]);
    expect(w.doughNotConfigured).toBe(false);
    expect(w.total).toBe(0);
  });

  test('이름만 있는 구성품은 이름으로 매칭한다', () => {
    const w = buildAllergenCoverageWarnings({
      menus: [menus[0]],
      masterByCode,
      ingredients,
      detailRecipes: [
        {
          menuCode: 'P-OR-009-L',
          components: [{ productCode: null, ingredientName: '고르곤졸라 치즈' }],
        },
      ],
      costEdges: [{}],
    });
    expect(w.unmatchedComponents).toEqual([]);
  });

  test('빈 입력에도 안전하다', () => {
    expect(buildAllergenCoverageWarnings({})).toMatchObject({
      menusWithoutRecipe: [],
      unmatchedComponents: [],
      doughNotConfigured: false,
      total: 0,
    });
  });

  test('표 출력 페이지가 배너로 노출한다(no-print, 출력물에는 안 들어감)', () => {
    const page = readFileSync(resolve('app/nutrition/export/NutritionLabelResult.jsx'), 'utf8');
    const notice = readFileSync(resolve('components/nutrition/AllergenCoverageNotice.jsx'), 'utf8');
    expect(page).toContain('buildAllergenCoverageWarnings({');
    expect(page).toContain('<AllergenCoverageNotice warnings={allergenWarnings} />');
    expect(notice).toContain('className="no-print"');
    expect(notice).toContain('알레르기 표시 확인 필요');
  });
});
