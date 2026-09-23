import { describe, expect, test } from '@jest/globals';
import { collectDiscontinuedIngredientRefs } from '../../lib/ingredient/discontinued-refs.js';

describe('collectDiscontinuedIngredientRefs', () => {
  test('단종/숨김 식자재가 레시피·세트그룹·엣지에 남아있으면 건수를 집계한다', () => {
    const rows = collectDiscontinuedIngredientRefs({
      ingredients: [
        { productCode: 'OLD01', ingredientName: '리치스 블랙올리브', discontinued: true },
        { productCode: 'OLD02', ingredientName: '숨김항목', excluded: true },
        { productCode: 'ACT01', ingredientName: '정상항목' },
      ],
      menuRecipes: [
        { menuName: '불고기피자', components: [{ productCode: 'OLD01' }] },
        { menuName: '치즈피자', components: [{ productCode: 'OLD01' }, { productCode: 'ACT01' }] },
      ],
      recipeGroups: [{ name: '토핑묶음', ingredients: [{ productCode: 'OLD02' }] }],
      edges: [{ edgeType: '치즈크러스트', components: [{ productCode: 'OLD01' }] }],
    });

    expect(rows).toHaveLength(2);
    const old01 = rows.find(r => r.productCode === 'OLD01');
    expect(old01).toMatchObject({
      ingredientName: '리치스 블랙올리브',
      discontinued: true,
      menuRecipeCount: 2,
      edgeCount: 1,
      recipeGroupCount: 0,
      totalCount: 3,
    });
    expect(old01.sampleMenuNames).toEqual(expect.arrayContaining(['불고기피자', '치즈피자']));

    const old02 = rows.find(r => r.productCode === 'OLD02');
    expect(old02).toMatchObject({ excluded: true, recipeGroupCount: 1, totalCount: 1 });

    // totalCount 내림차순
    expect(rows[0].productCode).toBe('OLD01');
  });

  test('참조가 전혀 없는 단종 식자재는 목록에서 빠진다', () => {
    const rows = collectDiscontinuedIngredientRefs({
      ingredients: [{ productCode: 'OLD99', ingredientName: '안쓰이는것', discontinued: true }],
      menuRecipes: [],
    });
    expect(rows).toHaveLength(0);
  });

  test('단종/숨김 아닌 식자재는 아예 후보에서 제외한다', () => {
    const rows = collectDiscontinuedIngredientRefs({
      ingredients: [{ productCode: 'ACT01', ingredientName: '정상' }],
      menuRecipes: [{ menuName: 'x', components: [{ productCode: 'ACT01' }] }],
    });
    expect(rows).toHaveLength(0);
  });

  test('배열이 없어도 던지지 않는다', () => {
    expect(collectDiscontinuedIngredientRefs()).toEqual([]);
    expect(collectDiscontinuedIngredientRefs({ ingredients: [] })).toEqual([]);
  });
});

/**
 * 회귀 방지(2026-09-23): 단종 메뉴에서만 쓰이는 단종 식자재가 "재연결 필요"로 계속 배너에
 * 남아 지울 방법이 없었다. 단종 메뉴는 원가·알레르기·원산지 출력에 안 나가므로 세지 않는다.
 */
describe('collectDiscontinuedIngredientRefs — 단종 메뉴 레시피 제외', () => {
  const ingredients = [{ productCode: 'OLD01', ingredientName: '고구마 맛탕', discontinued: true }];
  const menuMasters = [
    { menuCode: 'P-PR-001-L', menuName: '고구마 피자 L', status: 'discontinued' },
    { menuCode: 'P-PR-001-R', menuName: '고구마 피자 R', status: 'discontinued' },
    { menuCode: 'P-OR-006-L', menuName: '페페로니 피자 L', status: 'active' },
  ];

  test('단종 메뉴에서만 참조되면 목록에서 빠진다', () => {
    const rows = collectDiscontinuedIngredientRefs({
      ingredients,
      menuRecipes: [
        {
          menuCode: 'P-PR-001-L',
          menuName: '고구마 피자 L',
          components: [{ productCode: 'OLD01' }],
        },
        {
          menuCode: 'P-PR-001-R',
          menuName: '고구마 피자 R',
          components: [{ productCode: 'OLD01' }],
        },
      ],
      menuMasters,
    });
    expect(rows).toHaveLength(0);
  });

  test('판매 중 메뉴가 하나라도 참조하면 그 건수만 남는다', () => {
    const rows = collectDiscontinuedIngredientRefs({
      ingredients,
      menuRecipes: [
        {
          menuCode: 'P-PR-001-L',
          menuName: '고구마 피자 L',
          components: [{ productCode: 'OLD01' }],
        },
        {
          menuCode: 'P-OR-006-L',
          menuName: '페페로니 피자 L',
          components: [{ productCode: 'OLD01' }],
        },
      ],
      menuMasters,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ menuRecipeCount: 1, totalCount: 1 });
    expect(rows[0].sampleMenuNames).toEqual(['페페로니 피자 L']);
  });

  test('menuMasters를 안 넘기면 기존처럼 전부 센다', () => {
    const rows = collectDiscontinuedIngredientRefs({
      ingredients,
      menuRecipes: [
        {
          menuCode: 'P-PR-001-L',
          menuName: '고구마 피자 L',
          components: [{ productCode: 'OLD01' }],
        },
      ],
    });
    expect(rows).toHaveLength(1);
  });
});
