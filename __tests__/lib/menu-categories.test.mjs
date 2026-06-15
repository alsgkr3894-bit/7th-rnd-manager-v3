import { describe, expect, test } from '@jest/globals';
import { isMenuCategoryPizzaVariant, isPizzaCategory } from '../../lib/menu-categories.js';

describe('isMenuCategoryPizzaVariant', () => {
  test('피자 대분류와 변형 카테고리를 true로 판정한다', () => {
    expect(isMenuCategoryPizzaVariant('피자')).toBe(true);
    expect(isMenuCategoryPizzaVariant(' 피자/프리미엄 ')).toBe(true);
  });

  test('피자가 아닌 값과 비문자열 값은 false로 처리한다', () => {
    expect(isMenuCategoryPizzaVariant('사이드')).toBe(false);
    expect(isMenuCategoryPizzaVariant(null)).toBe(false);
    expect(isMenuCategoryPizzaVariant({ category: '피자' })).toBe(false);
  });

  test('기존 isPizzaCategory alias를 유지한다', () => {
    expect(isPizzaCategory).toBe(isMenuCategoryPizzaVariant);
  });
});
