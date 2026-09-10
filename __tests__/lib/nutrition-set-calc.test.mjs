import { describe, expect, test } from '@jest/globals';
import {
  buildSetPreviewRows,
  calcHalfMinMax,
  calcSetMinMax,
  getPizzaCalorieVariants,
} from '../../lib/nutrition/values/set-calc.js';

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
      crustLabel: '씬바샤삭',
      label: '씬바샤삭L',
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

    expect(result.bySize.L).toMatchObject({ minKcal: 90, maxKcal: 260 });
    expect(result.bySize.R).toMatchObject({ minKcal: 100, maxKcal: 230 });
    expect(result.minKcal).toBe(90);
    expect(result.maxKcal).toBe(260);
  });

  test('세트박스 구성품은 비피자 단품 슬롯을 우선 사용한다', () => {
    const result = calcSetMinMax(
      [{ label: '사이드', menuCodes: ['S-1'] }],
      [...pizzaMenus, { menuCode: 'S-1', menuName: '사이드', category: '사이드' }],
      {
        ...rawMap,
        'S-1__단품': { weight: 100, kcal: 20 },
      },
      {},
      pizzaMenus,
      edgeMap
    );

    expect(result.bySize.L).toMatchObject({ minKcal: 100, maxKcal: 270 });
    expect(result.bySize.R).toMatchObject({ minKcal: 110, maxKcal: 240 });
  });

  test('엣지 후보 총열량은 베이스 한판 총량에 엣지 절대 총량을 더하고 중량도 합산한다', () => {
    const variants = getPizzaCalorieVariants(
      { menuCode: 'P-W', menuName: '중량 피자' },
      {
        'P-W__석쇠L': { weight: 100, kcal: 100 },
      },
      {
        치즈크러스트L: { weight: 20, kcal: 50 },
      }
    );

    // 한판 총 100kcal + 엣지 절대 50kcal = 150kcal (과거 밀도 합산이면 180으로 부풀려짐)
    expect(variants.find(row => row.crustType === '치즈크러스트L')).toMatchObject({
      weight: 120,
      kcal: 150,
    });
  });

  test('세트박스 구성품에 부분 수량(qty/baseQty)이 있으면 영양값을 비율만큼만 반영한다', () => {
    // S-1__석쇠L = weight 100, kcal 10 → 완제품 기여분 10kcal/100g. qty 2 / baseQty 4 = 절반만 반영.
    const result = calcSetMinMax(
      [{ menuCodes: ['S-1'], qty: 2, baseQty: 4 }],
      [...pizzaMenus, { menuCode: 'S-1', menuName: '사이드', category: '사이드' }],
      rawMap,
      {},
      pizzaMenus,
      edgeMap
    );

    // 전체 수량 기준 결과(90/260, 100/230)에서 사이드 기여분(10)의 절반(5)만큼만 줄어든다.
    expect(result.bySize.L).toMatchObject({ minKcal: 85, maxKcal: 255 });
    expect(result.bySize.R).toMatchObject({ minKcal: 95, maxKcal: 225 });
  });

  test('세트박스 구성품에 qty/baseQty가 없으면 기존과 동일하게 전체 수량을 반영한다', () => {
    const withoutRatio = calcSetMinMax(
      [{ menuCodes: ['S-1'] }],
      [...pizzaMenus, { menuCode: 'S-1', menuName: '사이드', category: '사이드' }],
      rawMap,
      {},
      pizzaMenus,
      edgeMap
    );
    expect(withoutRatio.bySize.L).toMatchObject({ minKcal: 90, maxKcal: 260 });
    expect(withoutRatio.bySize.R).toMatchObject({ minKcal: 100, maxKcal: 230 });
  });

  test('세트박스는 피자 후보와 구성품 중량 범위를 함께 계산한다', () => {
    const result = calcSetMinMax(
      [{ label: '사이드', menuCodes: ['S-1'] }],
      [...pizzaMenus, { menuCode: 'S-1', menuName: '사이드', category: '사이드' }],
      {
        ...rawMap,
        'P-B__석쇠L': { weight: 120, kcal: 200 },
        'S-1__단품': { weight: 80, kcal: 10 },
      },
      {},
      pizzaMenus,
      {
        ...edgeMap,
        치즈크러스트L: { weight: 20, kcal: 50 },
      }
    );

    expect(result.bySize.L).toMatchObject({
      minWeight: 180,
      maxWeight: 220,
    });
  });
});

describe('buildSetPreviewRows', () => {
  const menuRefs = [...pizzaMenus, { menuCode: 'S-1', menuName: '사이드', category: '사이드' }];
  const setComps = [
    {
      kind: 'set',
      setName: '세트A',
      setSide: 'L',
      slots: [{ label: '사이드', menuCodes: ['S-1'] }],
    },
    {
      kind: 'set',
      setName: '세트A',
      setSide: 'R',
      slots: [{ label: '사이드', menuCodes: ['S-1'] }],
    },
  ];

  test('세트박스 L/R 사이드별로 한 행씩 min/max 열량을 반환한다 ("계산 결과" 미리보기용)', () => {
    const rows = buildSetPreviewRows(setComps, menuRefs, rawMap, {}, pizzaMenus, edgeMap);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ setName: '세트A', side: 'L', minKcal: 90, maxKcal: 260 });
    expect(rows[1]).toMatchObject({ setName: '세트A', side: 'R', minKcal: 100, maxKcal: 230 });
  });

  test('kind가 set이 아니거나 setSide가 L/R이 아니면 제외한다', () => {
    const rows = buildSetPreviewRows(
      [
        { kind: 'half', setSide: 'L' },
        { kind: 'set', setSide: 'X' },
      ],
      menuRefs,
      rawMap,
      {},
      pizzaMenus,
      edgeMap
    );
    expect(rows).toEqual([]);
  });

  test('setComps가 비어있으면 빈 배열을 반환한다', () => {
    expect(buildSetPreviewRows([], menuRefs, rawMap, {}, pizzaMenus, edgeMap)).toEqual([]);
    expect(buildSetPreviewRows(null, menuRefs, rawMap, {}, pizzaMenus, edgeMap)).toEqual([]);
  });
});
