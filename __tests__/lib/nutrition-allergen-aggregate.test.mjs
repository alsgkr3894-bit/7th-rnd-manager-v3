import { describe, expect, test } from '@jest/globals';
import {
  allergenNames,
  buildEdgeAllergenMap,
  buildMenuAllergenMap,
  buildToppingAllergenMap,
} from '@/lib/nutrition/allergen/aggregate';

/**
 * B1 회귀 방지: 출력 영양성분표의 메뉴별 알레르기 집계.
 * 엣지/도우 식자재가 ingredientToMenus를 통해 피자에 연결되면(엣지 확장은
 * ingredient-menu-map 테스트가 커버) 그 알레르겐이 메뉴 합집합에 포함돼야 한다.
 */
describe('buildMenuAllergenMap', () => {
  const ingredients = [
    { productCode: 'DGH', ingredientName: '도우', allergens: ['AL01'], category: '도우' }, // 도우(엣지) 유래
    { productCode: 'CHZ', ingredientName: '치즈', allergens: ['AL02'] }, // 레시피 재료
    { productCode: 'OLD', ingredientName: '단종재료', allergens: ['AL04'], discontinued: true }, // 제외돼야 함
    { productCode: 'EXC', ingredientName: '제외재료', allergens: ['AL05'], excluded: true }, // 제외돼야 함
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
    expect(allergenNames(new Set(['AL01', 'AL02']))).toBe('계란, 우유');
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

describe('buildEdgeAllergenMap', () => {
  test('엣지 구성품 알레르기를 nutrition edgeCode별로 변환한다', () => {
    const map = buildEdgeAllergenMap({
      ingredients: [
        { productCode: 'EGG', ingredientName: '계란액', allergens: ['AL01'] },
        { productCode: 'MILK', ingredientName: '치즈', allergens: ['AL02'] },
      ],
      edges: [
        {
          edgeType: '치즈크러스트',
          size: 'L',
          components: [{ productCode: 'EGG' }, { productCode: 'MILK' }],
        },
      ],
    });

    expect([...(map.get('치즈크러스트L') || [])].sort()).toEqual(['AL01', 'AL02']);
  });

  test('씬바사삭은 L 엣지 알레르기를 밀만 남기고 대두를 제거한다', () => {
    const map = buildEdgeAllergenMap({
      ingredients: [
        { productCode: 'SOY', ingredientName: '대두유', allergens: ['AL05'] },
        { productCode: 'WHEAT', ingredientName: '밀가루', allergens: ['AL06'] },
      ],
      edges: [
        {
          edgeType: '씬도우',
          size: 'L',
          components: [{ productCode: 'SOY' }, { productCode: 'WHEAT' }],
        },
      ],
    });

    expect([...(map.get('씬바사삭L') || [])]).toEqual(['AL06']);
    expect(map.has('씬바사삭' + 'R')).toBe(false);
  });

  test('치즈크러스트는 구성품 누락 시에도 우유 알레르기를 보정한다', () => {
    const map = buildEdgeAllergenMap({ ingredients: [], edges: [] });
    expect([...(map.get('치즈크러스트L') || [])]).toEqual(['AL02']);
    expect([...(map.get('치즈크러스트R') || [])]).toEqual(['AL02']);
  });
});

describe('buildToppingAllergenMap', () => {
  test('추가토핑 식자재코드로 알레르기를 집계한다', () => {
    const map = buildToppingAllergenMap({
      ingredients: [
        { productCode: 'TOP-ING', ingredientName: '페퍼로니', allergens: ['AL06'] },
        { productCode: 'OLD', ingredientName: '단종토핑', allergens: ['AL02'], discontinued: true },
      ],
      toppings: [
        { toppingCode: 'TOP-PEP', toppingName: '페퍼로니 추가', productCode: 'TOP-ING' },
        { toppingCode: 'TOP-OLD', toppingName: '단종 추가', productCode: 'OLD' },
      ],
    });

    expect([...(map.get('TOP-PEP') || [])]).toEqual(['AL06']);
    expect(map.has('TOP-OLD')).toBe(false);
  });

  test('식자재코드가 없으면 식자재명으로 추가토핑 알레르기를 매칭한다', () => {
    const map = buildToppingAllergenMap({
      ingredients: [{ ingredientName: '체다 치즈', allergens: ['AL02'] }],
      toppings: [{ toppingCode: 'TOP-CHZ', toppingName: '치즈 추가', ingredientName: '체다치즈' }],
    });

    expect([...(map.get('TOP-CHZ') || [])]).toEqual(['AL02']);
  });
});
