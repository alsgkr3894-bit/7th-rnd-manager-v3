import { describe, expect, test } from '@jest/globals';
import { buildToppingRecipePrefillPlan } from '@/lib/menu-master/topping-recipe-prefill';

const menus = [
  { menuCode: 'T-ETC-001', menuName: '치즈 80g', category: '추가토핑' },
  { menuCode: 'T-ETC-002', menuName: '페페로니 42g', category: '추가토핑' },
  { menuCode: 'T-ETC-003', menuName: '식자재 미연결 토핑', category: '추가토핑' },
  { menuCode: 'T-ETC-004', menuName: '토핑마스터에 없는 메뉴', category: '추가토핑' },
  { menuCode: 'P-PS-001-L', menuName: '치즈 80g', category: '피자' }, // 이름이 같아도 카테고리 아니면 제외
];

const toppings = [
  {
    toppingCode: 'ET-001',
    toppingName: '치즈 80g',
    productCode: 'CHZ',
    ingredientName: '체다치즈',
  },
  {
    toppingCode: 'ET-002',
    toppingName: '페페로니 42g',
    productCode: 'PEP',
    ingredientName: '페페로니',
  },
  { toppingCode: 'ET-003', toppingName: '식자재 미연결 토핑' }, // productCode 없음
];

const unitPriceMap = new Map([
  ['CHZ', { baseUnitType: 'g', unitPrice: 10 }],
  ['PEP', { baseUnitType: 'g', unitPrice: 20 }],
]);

describe('buildToppingRecipePrefillPlan', () => {
  test('이름이 같은 토핑마스터 항목의 식자재를 연결한다', () => {
    const plan = buildToppingRecipePrefillPlan(toppings, menus, new Map(), unitPriceMap);

    expect(plan).toHaveLength(2);
    const cheese = plan.find(p => p.menuCode === 'T-ETC-001');
    expect(cheese).toMatchObject({
      menuName: '치즈 80g',
      category: '추가토핑',
      kind: 'topping',
      size: '단일',
    });
    expect(cheese.components).toEqual([
      { productCode: 'CHZ', ingredientName: '체다치즈', quantity: null, unit: 'g' },
    ]);
  });

  test('productCode가 없는 토핑마스터 항목은 스킵한다', () => {
    const plan = buildToppingRecipePrefillPlan(toppings, menus, new Map(), unitPriceMap);
    expect(plan.find(p => p.menuCode === 'T-ETC-003')).toBeUndefined();
  });

  test('토핑마스터에 이름이 없는 메뉴는 스킵한다', () => {
    const plan = buildToppingRecipePrefillPlan(toppings, menus, new Map(), unitPriceMap);
    expect(plan.find(p => p.menuCode === 'T-ETC-004')).toBeUndefined();
  });

  test('추가토핑 카테고리가 아니면 이름이 같아도 스킵한다', () => {
    const plan = buildToppingRecipePrefillPlan(toppings, menus, new Map(), unitPriceMap);
    expect(plan.find(p => p.menuCode === 'P-PS-001-L')).toBeUndefined();
  });

  test('이미 구성품이 있는 레시피는 덮어쓰지 않는다(사용자 입력 보존)', () => {
    const existingRecipeMap = new Map([
      [
        'T-ETC-001',
        { components: [{ productCode: 'CHZ', ingredientName: '체다치즈', quantity: 100 }] },
      ],
    ]);

    const plan = buildToppingRecipePrefillPlan(toppings, menus, existingRecipeMap, unitPriceMap);

    expect(plan.find(p => p.menuCode === 'T-ETC-001')).toBeUndefined();
    // 아직 비어 있는 T-ETC-002는 그대로 연결된다.
    expect(plan.find(p => p.menuCode === 'T-ETC-002')).toBeDefined();
  });

  test('overwriteExisting:true면 이미 구성품이 있어도 다시 연결한다', () => {
    const existingRecipeMap = new Map([
      [
        'T-ETC-001',
        { components: [{ productCode: 'CHZ', ingredientName: '체다치즈', quantity: 100 }] },
      ],
    ]);

    const plan = buildToppingRecipePrefillPlan(toppings, menus, existingRecipeMap, unitPriceMap, {
      overwriteExisting: true,
    });

    expect(plan.find(p => p.menuCode === 'T-ETC-001')).toBeDefined();
  });

  test('멱등: 프리필 결과가 이미 레시피에 반영됐다면 다시 계획을 만들지 않는다', () => {
    const alreadyLinkedRecipeMap = new Map([
      ['T-ETC-001', { components: [{ productCode: 'CHZ', quantity: null }] }],
      ['T-ETC-002', { components: [{ productCode: 'PEP', quantity: null }] }],
    ]);

    const plan = buildToppingRecipePrefillPlan(
      toppings,
      menus,
      alreadyLinkedRecipeMap,
      unitPriceMap
    );

    expect(plan).toEqual([]);
  });
});
