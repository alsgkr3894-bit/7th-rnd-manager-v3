import { describe, expect, test } from '@jest/globals';
import {
  buildMissingRecipeSkeletons,
  buildRecipeMasterRecipePayload,
  buildRecipeMasterMenuPayload,
  normalizeRecipeMasterComponents,
  recipeStoreKindForCategory,
  recipeSyncTargetLabel,
} from '@/lib/recipe-master/sync';
import {
  buildIngredientIndex,
  buildRecipeMasterRows,
  calcComponentsCost,
  deriveComponentInfo,
  filterRecipeMasterRows,
  findIngredientByInput,
} from '@/lib/recipe-master/rows';

describe('recipe master sync helpers', () => {
  test('카테고리별 원가 레시피 저장소 대상을 결정한다', () => {
    expect(recipeStoreKindForCategory('피자/오리지널')).toBe('pizza');
    expect(recipeStoreKindForCategory('1인피자')).toBe('personal');
    expect(recipeStoreKindForCategory('세트박스')).toBe('set');
    expect(recipeStoreKindForCategory('사이드')).toBe('side');
    expect(recipeStoreKindForCategory('음료')).toBe('side');
    expect(recipeStoreKindForCategory('기타')).toBeNull();
  });

  test('구성품은 원가 레시피 저장 형식으로 정규화한다', () => {
    expect(
      normalizeRecipeMasterComponents([
        {
          productCode: ' ING-1 ',
          ingredientName: ' 치즈 ',
          quantity: '10.5',
          unit: ' g ',
          unitPrice: '12.3',
          note: ' memo ',
        },
        { productCode: '', ingredientName: '', quantity: '', unit: '', unitPrice: '' },
      ])
    ).toEqual([
      {
        productCode: 'ING-1',
        ingredientName: '치즈',
        quantity: 10.5,
        unit: 'g',
        unitPrice: 12.3,
        note: 'memo',
      },
    ]);
  });

  test('메뉴 마스터 저장 페이로드를 만든다', () => {
    expect(
      buildRecipeMasterMenuPayload({
        menuId: 7,
        menuCode: ' P-OR-001-L ',
        menuName: ' 테스트피자 ',
        category: ' 피자/오리지널 ',
        size: 'L',
        price: '19900',
        status: 'test',
        note: ' note ',
      })
    ).toEqual({
      id: 7,
      menuCode: 'P-OR-001-L',
      menuName: '테스트피자',
      category: '피자/오리지널',
      size: 'L',
      price: 19900,
      status: 'test',
      source: 'recipe-master',
      note: 'note',
    });
  });

  test('레시피마스터 저장소 페이로드를 만든다', () => {
    expect(
      buildRecipeMasterRecipePayload(
        {
          menuCode: ' P-OR-001-L ',
          menuName: ' 테스트피자 ',
          size: 'L',
          note: ' recipe note ',
        },
        [{ ingredientName: ' 치즈 ', quantity: '2', unitPrice: '100' }]
      )
    ).toEqual({
      menuCode: 'P-OR-001-L',
      menuName: '테스트피자',
      size: 'L',
      components: [
        {
          productCode: null,
          ingredientName: '치즈',
          quantity: 2,
          unit: 'g',
          unitPrice: 100,
          note: '',
        },
      ],
      note: 'recipe note',
    });
  });

  test('메뉴마스터 등록 메뉴 중 누락된 레시피마스터 기본 레코드를 찾는다', () => {
    const skeletons = buildMissingRecipeSkeletons({
      menuRows: [
        { menuCode: 'P-OR-001-L', menuName: '기존 피자', category: '피자', size: 'L' },
        { menuCode: 'S-CHK-001', menuName: '치킨텐더', category: '사이드' },
        { menuCode: 'ET-001', menuName: '추가토핑', category: '추가토핑' },
        { menuName: '코드 없음', category: '피자' },
      ],
      recipeMaps: {
        pizza: new Map([['P-OR-001-L', { menuCode: 'P-OR-001-L' }]]),
        side: new Map(),
      },
    });

    expect(skeletons).toEqual([
      {
        kind: 'side',
        payload: {
          menuCode: 'S-CHK-001',
          menuName: '치킨텐더',
          size: '단일',
          components: [],
          note: '',
        },
      },
    ]);
  });

  test('대상 라벨을 반환한다', () => {
    expect(recipeSyncTargetLabel('pizza')).toBe('피자 원가');
    expect(recipeSyncTargetLabel(null)).toBe('미지원');
  });

  test('식자재 인덱스와 구성품 파생 정보를 계산한다', () => {
    const index = buildIngredientIndex([
      {
        productCode: 'CHZ',
        ingredientName: '체다 치즈',
        allergens: ['AL02'],
        origin: [{ displayName: '치즈', country: '미국' }],
      },
    ]);

    expect(findIngredientByInput('체다치즈', index)?.productCode).toBe('CHZ');
    expect(findIngredientByInput('CHZ', index)?.ingredientName).toBe('체다 치즈');
    expect(
      deriveComponentInfo([{ productCode: 'CHZ', ingredientName: '다른 이름' }], index)
    ).toEqual({
      allergenCodes: ['AL02'],
      origins: [{ displayName: '치즈', country: '미국' }],
    });
  });

  test('메뉴와 레시피 맵을 목록 행으로 합친다', () => {
    const rows = buildRecipeMasterRows({
      menuRows: [{ menuCode: 'S-CHK-001', menuName: '치킨텐더', category: '사이드' }],
      recipeMaps: {
        side: new Map([
          [
            'S-CHK-001',
            {
              menuCode: 'S-CHK-001',
              components: [{ ingredientName: '닭', quantity: 2, unitPrice: 100 }],
            },
          ],
        ]),
      },
      ingredientIndex: buildIngredientIndex([{ ingredientName: '닭', allergens: ['AL01'] }]),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        kind: 'side',
        allergenCount: 1,
        cost: 200,
      }),
    ]);
    expect(filterRecipeMasterRows(rows, '치킨')).toHaveLength(1);
    expect(filterRecipeMasterRows(rows, '피자')).toHaveLength(0);
    expect(calcComponentsCost([{ quantity: 3, unitPrice: 50 }])).toBe(150);
  });
});
