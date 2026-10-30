import { describe, expect, test } from '@jest/globals';
import { UnitPriceMap, buildUnitPriceMap } from '../../lib/recipe/index.js';
import { componentEffectiveUnitPrice } from '../../lib/cost/shared/effective-cost.js';

// 2026-10-30: 제품코드 대소문자 처리가 화면마다 달라, 같은 레시피 줄이 어떤 화면에서는 식자재 단가에
// 연결되고 다른 화면에서는 안 되던 것 — 단가 맵이 대소문자·앞뒤 공백만 다른 코드도 찾는다.
const ingredients = [
  {
    id: 1,
    productCode: 'CC410249',
    ingredientName: '피자소스',
    baseQuantity: 1000,
    baseUnitType: 'g',
  },
  {
    id: 2,
    productCode: '',
    ingredientName: '양파',
    baseQuantity: 1000,
    baseUnitType: 'g',
    priceOverride: 1500,
  },
];
const priceRows = new Map([['CC410249', { productCode: 'CC410249', priceWithTax: 3700 }]]);

describe('UnitPriceMap — 제품코드 대소문자·공백 허용', () => {
  const map = buildUnitPriceMap(ingredients, priceRows);

  test('buildUnitPriceMap은 UnitPriceMap(Map의 하위 클래스)을 돌려준다', () => {
    expect(map).toBeInstanceOf(UnitPriceMap);
    expect(map).toBeInstanceOf(Map);
  });

  test('정확히 같은 코드뿐 아니라 대소문자·앞뒤 공백이 다른 코드도 같은 항목을 찾는다', () => {
    const exact = map.get('CC410249');
    expect(exact.unitPrice).toBe(3.7);
    expect(map.get('cc410249')).toBe(exact);
    expect(map.get('  Cc410249 ')).toBe(exact);
    expect(map.has('cc410249')).toBe(true);
  });

  test('없는 코드는 그대로 없다', () => {
    expect(map.get('CC999999')).toBeUndefined();
    expect(map.has('CC999999')).toBe(false);
    expect(map.get('')).toBeUndefined();
    expect(map.get(null)).toBeUndefined();
  });

  test('수동 식자재(id 키)도 그대로 찾는다', () => {
    expect(map.get('2').unitPrice).toBe(1.5);
  });

  test('크기·순회는 별칭 없이 일반 Map과 같다', () => {
    expect(map.size).toBe(2);
    expect([...map.keys()].sort()).toEqual(['2', 'CC410249']);
  });

  test('정확히 같은 키가 별칭보다 우선한다', () => {
    const custom = new UnitPriceMap();
    custom.set('abc', { unitPrice: 1 });
    custom.set('ABC', { unitPrice: 2 });
    expect(custom.get('abc').unitPrice).toBe(1);
    expect(custom.get('ABC').unitPrice).toBe(2);
    expect(custom.get('Abc').unitPrice).toBe(1); // 먼저 들어온 키
  });

  test('delete·clear 뒤에는 별칭으로도 찾지 못한다', () => {
    const custom = new UnitPriceMap();
    custom.set('ABC', { unitPrice: 2 });
    custom.delete('ABC');
    expect(custom.get('abc')).toBeUndefined();
    custom.set('XYZ', { unitPrice: 3 });
    custom.clear();
    expect(custom.get('xyz')).toBeUndefined();
  });

  test('레시피 구성품의 코드 대소문자가 달라도 최신 단가를 따른다', () => {
    expect(
      componentEffectiveUnitPrice({ productCode: 'cc410249', unitPrice: 99, quantity: 1 }, map)
    ).toBe(3.7);
  });
});
