import { describe, expect, test } from '@jest/globals';
import { calcHalfMinMax, calcSetMinMax } from '../../lib/nutrition/values/set-calc.js';

const pizzaMenus = [
  { menuCode: 'P-A', menuName: '가 피자', category: '피자' },
  { menuCode: 'P-B', menuName: '나 피자', category: '피자' },
];

const rawMap = {
  'P-A__석쇠L': { weight: 100, kcal: 100 },
  'P-A__석쇠R': { weight: 100, kcal: 90 },
  'P-A__씬바사삭L': { weight: 100, kcal: 80 },
  'P-B__석쇠L': { weight: 100, kcal: 200 },
  'P-B__석쇠R': { weight: 100, kcal: 180 },
  'P-B__씬바사삭L': { weight: 100, kcal: 160 },
  'S-1__석쇠L': { weight: 100, kcal: 10 },
};

const edgeMap = {
  치즈크러스트L: { kcal: 50 },
  치즈크러스트R: { kcal: 40 },
  골드스윗L: { kcal: 20 },
  골드스윗R: { kcal: 15 },
};

describe('nutrition set calc', () => {
  test('하프앤하프 후보는 엣지 포함 총열량 높은순으로 산출한다', () => {
    const result = calcHalfMinMax(pizzaMenus, rawMap, edgeMap);
    expect(result.variants[0]).toMatchObject({
      menuCode: 'P-B',
      crustType: '치즈크러스트L',
      kcal: 250,
      highRank: true,
    });
    expect(result.variants[result.variants.length - 1]).toMatchObject({
      menuCode: 'P-A',
      crustType: '씬바사삭L',
      kcal: 80,
      lowRank: true,
    });
    expect(result.bySide.L.maxKcal).toBe(235);
    expect(result.bySide.R.maxKcal).toBe(208);
  });

  test('세트박스는 피자 자동 후보를 L세트/R세트로 나누고 엣지를 반영한다', () => {
    const result = calcSetMinMax(
      [{ label: '사이드', menuCodes: ['S-1'] }],
      [...pizzaMenus, { menuCode: 'S-1', menuName: '사이드', category: '사이드' }],
      rawMap,
      {},
      pizzaMenus,
      edgeMap
    );

    expect(result.bySize.L).toEqual({ minKcal: 90, maxKcal: 260 });
    expect(result.bySize.R).toEqual({ minKcal: 100, maxKcal: 230 });
    expect(result.minKcal).toBe(90);
    expect(result.maxKcal).toBe(260);
  });
});
