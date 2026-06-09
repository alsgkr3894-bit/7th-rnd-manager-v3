import { describe, expect, test } from '@jest/globals';
import { buildMenuAllergenMap, allergenNames } from '@/lib/nutrition/allergen/aggregate';

/**
 * B1 회귀 방지: 출력 영양성분표의 메뉴별 알레르기 집계.
 * 엣지/도우 식자재가 ingredientToMenus를 통해 피자에 연결되면(엣지 확장은
 * ingredient-menu-map 테스트가 커버) 그 알레르겐이 메뉴 합집합에 포함돼야 한다.
 */
describe('buildMenuAllergenMap', () => {
  const ingredients = [
    { productCode: 'DGH', ingredientName: '도우',   allergens: ['AL01'], category: '도우' }, // 도우(엣지) 유래
    { productCode: 'CHZ', ingredientName: '치즈',   allergens: ['AL02'] },                    // 레시피 재료
    { productCode: 'OLD', ingredientName: '단종재료', allergens: ['AL04'], discontinued: true }, // 제외돼야 함
    { productCode: 'EXC', ingredientName: '제외재료', allergens: ['AL05'], excluded: true },     // 제외돼야 함
  ];

  // ingredientToMenus: Map<key, Map<menuCode, meta>> — 도우/치즈/단종 모두 PZ1에 연결
  const ingredientToMenus = new Map([
    ['code:DGH', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
    ['code:CHZ', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
    ['code:OLD', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
    ['code:EXC', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
  ]);

  test('피자 메뉴 알레르겐 = 도우(엣지)+레시피 재료 합집합, 단종/제외는 제외', () => {
    const map = buildMenuAllergenMap({ ingredients, ingredientToMenus });
    const codes = map.get('PZ1');
    expect(codes).toBeInstanceOf(Set);
    expect([...codes].sort()).toEqual(['AL01', 'AL02']); // 도우(AL01)+치즈(AL02), 단종/제외 빠짐
  });

  test('name: 키 폴백으로도 매칭된다', () => {
    const i2m = new Map([
      ['name:치즈', new Map([['PZ2', { menuName: '치즈피자', category: '피자' }]])],
    ]);
    const map = buildMenuAllergenMap({ ingredients, ingredientToMenus: i2m });
    expect([...(map.get('PZ2') || [])]).toEqual(['AL02']);
  });

  test('비정상 입력은 빈 집계로 안전하게 처리한다', () => {
    expect(buildMenuAllergenMap()).toBeInstanceOf(Map);
    expect(buildMenuAllergenMap().size).toBe(0);
    expect(buildMenuAllergenMap({ ingredients: null, ingredientToMenus: {} }).size).toBe(0);
    expect(
      buildMenuAllergenMap({
        ingredients: [{ ingredientName: { ko: '치즈' }, allergens: ['AL02'] }, null, 'bad'],
        ingredientToMenus: new Map([['name:치즈', { bad: true }]]),
      }).size
    ).toBe(0);
  });
});

describe('allergenNames', () => {
  test('코드 Set을 한글 이름 쉼표 문자열로 변환', () => {
    expect(allergenNames(new Set(['AL01', 'AL02']))).toBe('알류(계란), 우유');
  });
  test('알 수 없는 코드는 코드 그대로 폴백', () => {
    expect(allergenNames(new Set(['ZZ99']))).toBe('ZZ99');
  });
  test('빈 입력은 빈 문자열', () => {
    expect(allergenNames(new Set())).toBe('');
    expect(allergenNames(undefined)).toBe('');
    expect(allergenNames(new Set([null, 'ZZ99']))).toBe('ZZ99');
  });
});
