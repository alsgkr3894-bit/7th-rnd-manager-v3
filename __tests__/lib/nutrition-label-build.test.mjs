import { describe, expect, test } from '@jest/globals';
import {
  buildBeverageSheet,
  buildPizzaSheet,
  buildPizzaSliceSheet,
  buildToppingSheet,
  parseVolumeMl,
  scaleVal,
} from '../../lib/nutrition/label/build.js';

const menuAllergenMap = new Map();

describe('nutrition label build helpers', () => {
  test('scaleVal은 100g 기준값을 목표 중량으로 환산한다', () => {
    expect(scaleVal(200, 150)).toBe(300);
    expect(scaleVal('33.33', 150)).toBe(50);
    expect(scaleVal('', 150)).toBe('');
    expect(scaleVal('not-number', 150)).toBe('');
  });

  test('parseVolumeMl은 메뉴명과 코드에서 ml/L 용량을 파싱한다', () => {
    expect(parseVolumeMl('콜라 1.5L', 'D-COLA')).toBe(1500);
    expect(parseVolumeMl('제로콜라 355ml', 'D-ZERO')).toBe(355);
    expect(parseVolumeMl('사이다', 'SPRITE-1.25l')).toBe(1250);
    expect(parseVolumeMl('아이스티', 'D-TEA')).toBeNull();
  });
});

describe('buildPizzaSliceSheet', () => {
  test('1조각 열량이 100kcal를 넘으면 1회제공량을 1조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-001', menuName: '테스트 피자', category: '피자' }],
      rawMap: {
        'P-001__석쇠L': { weight: 800, kcal: 200, sugar: 10, protein: 20, satFat: 4, sodium: 300 },
        'P-001__석쇠R': { weight: 640, kcal: 180, sugar: 8, protein: 18, satFat: 3, sodium: 280 },
        'P-001__씬바사삭L': {
          weight: 720,
          kcal: 160,
          sugar: 6,
          protein: 16,
          satFat: 2,
          sodium: 240,
        },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-001': { L: 8, R: 8 } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rows.some(row => row.crustLabel === '씬바사삭' && row.side === 'R')).toBe(false);
    expect(rows[0].rows[0]).toMatchObject({
      crustLabel: '석쇠',
      side: 'L',
      slice: 8,
      servingLabel: '1조각',
      weight: 100,
      kcal: 200,
      sugar: 10,
      protein: 20,
      satFat: 4,
      sodium: 300,
    });
  });

  test('1조각 열량이 정확히 100kcal이면 1조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-100', menuName: '경계값 피자', category: '피자' }],
      rawMap: {
        'P-100__석쇠L': { weight: 800, kcal: 100, sugar: 1, protein: 2, satFat: 1, sodium: 50 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-100': { L: 8 } },
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '1조각',
      weight: 100,
      kcal: 100,
    });
  });

  test('1조각 열량이 100kcal 이하이고 2조각도 100kcal 이하이면 3조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-LOW', menuName: '저열량 피자', category: '피자' }],
      rawMap: {
        'P-LOW__석쇠L': { weight: 800, kcal: 40, sugar: 2, protein: 4, satFat: 1, sodium: 80 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-LOW': { L: 8 } },
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '3조각',
      weight: 300,
      kcal: 120,
      sugar: 6,
      protein: 12,
      satFat: 3,
      sodium: 240,
    });
  });

  test('1조각은 100kcal 이하이고 2조각은 100kcal 초과이면 2조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-MID', menuName: '중간열량 피자', category: '피자' }],
      rawMap: {
        'P-MID__석쇠L': { weight: 800, kcal: 60, sugar: 2, protein: 4, satFat: 1, sodium: 80 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-MID': { L: 8 } },
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '2조각',
      weight: 200,
      kcal: 120,
    });
  });

  test('중량이 없으면 조각 기준 영양값을 대시로 표시한다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-MISSING', menuName: '미입력 피자', category: '피자' }],
      rawMap: { 'P-MISSING__석쇠L': { kcal: 200 } },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: {},
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '—',
      weight: '—',
      kcal: '—',
      sugar: '—',
      protein: '—',
      satFat: '—',
      sodium: '—',
    });
  });
});

describe('buildPizzaSheet', () => {
  test('엣지 행은 메뉴 기본 알레르기에 해당 엣지 알레르기를 합산한다', () => {
    const rows = buildPizzaSheet({
      menus: [{ menuCode: 'P-EDGE', menuName: '엣지 피자', category: '피자' }],
      rawMap: {
        'P-EDGE__석쇠L': { weight: 800, kcal: 200 },
      },
      edgeMap: {
        치즈크러스트L: { kcal: 10 },
      },
      masterByCode: {},
      menuAllergenMap: new Map([['P-EDGE', new Set(['AL02'])]]),
      edgeAllergenMap: new Map([['치즈크러스트L', new Set(['AL01'])]]),
    });

    const edgeRow = rows[0].rows.find(row => row.crustLabel === '치즈크러스트' && row.side === 'L');
    expect(edgeRow.allergen).toBe('우유, 계란');
  });

  test('1인피자는 피자 시트 맨 아래에 배치한다', () => {
    const rows = buildPizzaSheet({
      menus: [
        { menuCode: 'P-ONE-001', menuName: '더블치즈 (1인용)', category: '피자' },
        { menuCode: 'P-001', menuName: '테스트 피자', category: '피자' },
      ],
      rawMap: {},
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
    });

    expect(rows.map(row => row.menuCode)).toEqual(['P-001', 'P-ONE-001']);
    expect(rows[1].rows).toHaveLength(1);
    expect(rows[1].rows[0]).toMatchObject({ crustLabel: '씬바사삭', side: 'L' });
  });
});

describe('buildBeverageSheet', () => {
  test('음료는 g 중량 대신 파싱한 용량 ml 기준으로 환산한다', () => {
    const rows = buildBeverageSheet({
      menus: [{ menuCode: 'D-COLA', menuName: '콜라 1.25L', category: '음료' }],
      rawMap: {
        'D-COLA__석쇠L': { kcal: 40, sugar: 9, protein: 0, satFat: 0, sodium: 5 },
      },
      masterByCode: {},
      menuAllergenMap,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        menuCode: 'D-COLA',
        weight: 1250,
        kcal: 500,
        sugar: 113,
        protein: 0,
        satFat: 0,
        sodium: 63,
      }),
    ]);
  });
});

describe('buildToppingSheet', () => {
  test('추가토핑 마스터 입력값과 식자재 알레르기를 표출력 행으로 만든다', () => {
    const rows = buildToppingSheet({
      menus: [],
      rawMap: {},
      masterByCode: {},
      menuAllergenMap,
      toppings: [
        {
          toppingCode: 'TOP-PEP',
          toppingName: '페퍼로니 추가',
          productCode: 'P001',
          ingredientName: '페퍼로니',
          weight: 30,
          kcal: 55.4,
          sugar: 1.2,
          protein: 3.6,
          satFat: 0.4,
          sodium: 120.2,
        },
      ],
      toppingAllergenMap: new Map([['TOP-PEP', new Set(['AL06'])]]),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        menuCode: 'TOP-PEP',
        menuName: '페퍼로니 추가',
        productCode: 'P001',
        ingredientName: '페퍼로니',
        weight: 30,
        kcal: 55,
        sugar: 1,
        protein: 4,
        satFat: 0,
        sodium: 120,
        allergen: '밀',
      }),
    ]);
  });

  test('추가토핑 마스터와 기존 메뉴마스터 추가토핑을 함께 유지한다', () => {
    const rows = buildToppingSheet({
      menus: [{ menuCode: 'LEGACY-TOP', menuName: '기존 토핑', category: '추가토핑' }],
      rawMap: {
        'LEGACY-TOP__석쇠L': {
          basis: 'serving',
          weight: 20,
          kcal: 40,
          sugar: 1,
          protein: 2,
          satFat: 0,
          sodium: 30,
        },
      },
      masterByCode: {},
      menuAllergenMap: new Map([['LEGACY-TOP', new Set(['AL02'])]]),
      toppings: [{ toppingCode: 'TOP-NEW', toppingName: '신규 토핑', kcal: 10 }],
      toppingAllergenMap: new Map(),
    });

    expect(rows.map(row => row.menuName)).toEqual(['신규 토핑', '기존 토핑']);
    expect(rows[1].allergen).toBe('우유');
  });
});
