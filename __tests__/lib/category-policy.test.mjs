import {
  isBeverageCategory,
  isExtraToppingCategory,
  isPersonalPizzaCategory,
  isPizzaCategory,
  isSetCategory,
  isSideCategory,
  resolveMenuCategoryGroup,
} from '../../lib/menu-master/category-policy.js';

describe('menu category policy', () => {
  test('pizza category supports arbitrary pizza subcategories', () => {
    expect(isPizzaCategory('피자')).toBe(true);
    expect(isPizzaCategory('피자/프리미엄')).toBe(true);
    expect(isPizzaCategory('피자/신메뉴')).toBe(true);
  });

  test('personal pizza can be included or excluded explicitly', () => {
    expect(isPersonalPizzaCategory('1인피자')).toBe(true);
    expect(isPizzaCategory('1인피자')).toBe(true);
    expect(isPizzaCategory('1인피자', { includePersonal: false })).toBe(false);
  });

  test('side, beverage, set, topping helpers classify known labels', () => {
    expect(isSideCategory('소스')).toBe(true);
    expect(isSideCategory('사이드/파스타')).toBe(true);
    expect(isBeverageCategory('음료')).toBe(true);
    expect(isSetCategory('세트박스')).toBe(true);
    expect(isExtraToppingCategory('추가토핑')).toBe(true);
  });

  test('resolveMenuCategoryGroup returns normalized groups', () => {
    expect(resolveMenuCategoryGroup('피자/하프앤하프')).toBe('하프앤하프');
    expect(resolveMenuCategoryGroup('1인피자')).toBe('피자');
    expect(resolveMenuCategoryGroup('사이드/파스타')).toBe('사이드');
    expect(resolveMenuCategoryGroup('기타')).toBe('기타');
  });
});
