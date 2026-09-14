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
