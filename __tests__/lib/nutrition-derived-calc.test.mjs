import { describe, expect, test } from '@jest/globals';
import { calcAllResults } from '../../lib/nutrition/values/store.js';

describe('nutrition derived menu calc', () => {
  test('파생 메뉴는 식자재 영양값을 더하지 않고 베이스 메뉴 직접 입력값을 따른다', () => {
    const results = calcAllResults({
      menus: [{ menuCode: 'PZ-BASE', menuName: '베이스 피자', category: '피자' }],
      rawMap: {
        'PZ-BASE__석쇠L': { weight: 100, kcal: 100, protein: 10 },
        'PZ-BASE__석쇠R': { weight: 90, kcal: 90, protein: 9 },
        'PZ-BASE__씬바사삭L': { weight: 80, kcal: 80, protein: 8 },
      },
      edgeMap: {
        치즈크러스트L: { weight: 10, kcal: 30, protein: 3 },
      },
      compositions: [
        {
          menuCode: 'PZ-DERIVED',
          menuName: '파생 피자',
          baseMenuCode: 'PZ-BASE',
          ingredientCodes: ['ING-CHEESE'],
          ingredientAmounts: {
            'ING-CHEESE': { L: 10, R: 10 },
          },
        },
      ],
      ingredientNutritionMap: {
        'ING-CHEESE': { kcal: 200, protein: 20 },
      },
      masterByCode: {
        'PZ-BASE': { menuCode: 'PZ-BASE', category: '피자' },
      },
    });

    const baseVariant = results.find(
      row => row.menuCode === 'PZ-DERIVED' && row.crustType === '석쇠L'
    );
    expect(baseVariant).toMatchObject({
      menuName: '파생 피자',
      baseMenuCode: 'PZ-BASE',
      baseMenuName: '베이스 피자',
      isDerived: true,
      weight: 100,
      kcal: 100,
      protein: 10,
    });

    const edgeVariant = results.find(
      row => row.menuCode === 'PZ-DERIVED' && row.crustType === '치즈크러스트L'
    );
    expect(edgeVariant).toMatchObject({
      baseMenuCode: 'PZ-BASE',
      weight: 110,
      kcal: 130,
      protein: 13,
    });
    expect(
      results.some(row => row.menuCode === 'PZ-DERIVED' && row.crustType === '씬바사삭' + 'R')
    ).toBe(false);
  });

  test('파생 메뉴 엣지는 베이스 사이즈별 값에 엣지 조정값만 더한다', () => {
    const results = calcAllResults({
      menus: [{ menuCode: 'PZ-BASE', menuName: '베이스 피자', category: '피자' }],
      rawMap: {
        'PZ-BASE__석쇠L': { weight: 100, kcal: 100, protein: 10 },
        'PZ-BASE__석쇠R': { weight: 90, kcal: 90, protein: 9 },
        'PZ-BASE__씬바사삭L': { weight: 80, kcal: 80, protein: 8 },
      },
      edgeMap: {
        치즈크러스트R: { weight: 8, kcal: 16, protein: 1 },
      },
      compositions: [
        {
          menuCode: 'PZ-DERIVED',
          menuName: '파생 피자',
          baseMenuCode: 'PZ-BASE',
          ingredientCodes: ['ING-CHEESE'],
          ingredientAmounts: {
            'ING-CHEESE': { L: 20, R: 5 },
          },
        },
      ],
      ingredientNutritionMap: {
        'ING-CHEESE': { weight: 100, kcal: 200, protein: 20 },
      },
      masterByCode: {
        'PZ-BASE': { menuCode: 'PZ-BASE', category: '피자' },
      },
    });

    expect(
      results.find(row => row.menuCode === 'PZ-DERIVED' && row.crustType === '석쇠L')
    ).toMatchObject({
      weight: 100,
      kcal: 100,
      protein: 10,
    });
    expect(
      results.find(row => row.menuCode === 'PZ-DERIVED' && row.crustType === '석쇠R')
    ).toMatchObject({
      weight: 90,
      kcal: 90,
      protein: 9,
    });
    expect(
      results.find(row => row.menuCode === 'PZ-DERIVED' && row.crustType === '치즈크러스트R')
    ).toMatchObject({
      weight: 98,
      kcal: 106,
      protein: 10,
    });
  });

  test('피자가 아닌 메뉴는 석쇠/씬 변형 대신 단품 결과만 만든다', () => {
    const results = calcAllResults({
      menus: [{ menuCode: 'S-WING', menuName: '핫윙', category: '사이드' }],
      rawMap: {
        'S-WING__단품': { basis: 'serving', weight: 120, kcal: 250 },
        'S-WING__석쇠L': { basis: 'serving', weight: 1, kcal: 1 },
      },
      edgeMap: {},
      compositions: [],
      masterByCode: {
        'S-WING': { menuCode: 'S-WING', category: '사이드' },
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      menuCode: 'S-WING',
      crustType: '단품',
      weight: 120,
      kcal: 250,
    });
  });
});
