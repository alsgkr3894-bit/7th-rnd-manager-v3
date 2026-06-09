import { describe, expect, test } from '@jest/globals';
import { isPizzaCategory } from '../../lib/menu-categories.js';

describe('isPizzaCategory', () => {
  test('피자 대분류와 변형 카테고리를 true로 판정한다', () => {
    expect(isPizzaCategory('피자')).toBe(true);
    expect(isPizzaCategory(' 피자/프리미엄 ')).toBe(true);
  });

  test('피자가 아닌 값과 비문자열 값은 false로 처리한다', () => {
    expect(isPizzaCategory('사이드')).toBe(false);
    expect(isPizzaCategory(null)).toBe(false);
    expect(isPizzaCategory({ category: '피자' })).toBe(false);
  });
});
