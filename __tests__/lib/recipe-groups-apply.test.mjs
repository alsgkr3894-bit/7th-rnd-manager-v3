import { groupAppliesToCategory, createDefaultGroupResolver } from '../../lib/cost/recipe-groups/apply.js';

describe('groupAppliesToCategory', () => {
  test('정확히 일치하는 카테고리에 적용', () => {
    const g = { id: 'g1', defaultCategories: ['피자'] };
    expect(groupAppliesToCategory(g, '피자')).toBe(true);
  });

  test("'cat/' 접두사로 시작하면 적용", () => {
    const g = { id: 'g1', defaultCategories: ['피자'] };
    expect(groupAppliesToCategory(g, '피자/오리지널')).toBe(true);
  });

  test('접두사가 부분 문자열일 뿐이면 미적용 (슬래시 경계 필요)', () => {
    const g = { id: 'g1', defaultCategories: ['피자'] };
    expect(groupAppliesToCategory(g, '피자빵')).toBe(false);
  });

  test('일치하는 카테고리가 없으면 미적용', () => {
    const g = { id: 'g1', defaultCategories: ['사이드'] };
    expect(groupAppliesToCategory(g, '피자')).toBe(false);
  });

  test('defaultCategories 누락/빈 값 안전 처리', () => {
    expect(groupAppliesToCategory({ id: 'g1' }, '피자')).toBe(false);
    expect(groupAppliesToCategory(null, '피자')).toBe(false);
    expect(groupAppliesToCategory({ defaultCategories: ['피자'] }, undefined)).toBe(false);
  });
});

describe('createDefaultGroupResolver', () => {
  const groups = [
    { id: 'g1', defaultCategories: ['피자'] },
    { id: 'g2', defaultCategories: ['피자/오리지널', '사이드'] },
    { id: 'g3', defaultCategories: ['음료'] },
  ];

  test('카테고리별 적용 그룹 id Set 반환', () => {
    const resolve = createDefaultGroupResolver(groups);
    expect(resolve('피자')).toEqual(new Set(['g1']));
    expect(resolve('피자/오리지널')).toEqual(new Set(['g1', 'g2']));
    expect(resolve('사이드')).toEqual(new Set(['g2']));
    expect(resolve('없는카테고리')).toEqual(new Set());
  });

  test('동일 카테고리 재호출 시 같은 Set 인스턴스를 캐싱하여 반환', () => {
    const resolve = createDefaultGroupResolver(groups);
    const first = resolve('피자');
    const second = resolve('피자');
    expect(second).toBe(first);
  });

  test('비배열 입력 안전 처리', () => {
    const resolve = createDefaultGroupResolver(null);
    expect(resolve('피자')).toEqual(new Set());
  });
});
