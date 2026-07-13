import { describe, expect, test } from '@jest/globals';
import {
  buildBeverageSheet,
  buildPizzaSheet,
  buildPizzaSliceSheet,
  buildSetHalfSheet,
  buildSideSheet,
  buildToppingSheet,
  parseVolumeMl,
  scaleVal,
} from '../../lib/nutrition/label/build.js';
import { buildPosterPizzaRows } from '../../lib/nutrition/label/poster.js';

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

describe('buildPosterPizzaRows', () => {
  test('출력명이 같아도 메뉴코드가 다르면 포스터 행을 병합하지 않는다', () => {
    const rows = buildPosterPizzaRows(
      [
        {
          menuCode: 'P-12PCS',
          menuName: '치킨바샤삭',
          rows: [{ crustLabel: '석쇠', side: 'L', weight: 100, servingLabel: '1조각' }],
        },
        {
          menuCode: 'P-6PCS',
          menuName: '치킨바샤삭',
          rows: [{ crustLabel: '석쇠', side: 'L', weight: 80, servingLabel: '1조각' }],
        },
      ],
      []
    );

    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.menuCode)).toEqual(['P-12PCS', 'P-6PCS']);
    expect(rows.map(row => row.sides.L.weight)).toEqual([100, 80]);
  });
});

describe('buildPizzaSliceSheet', () => {
  test('1조각 중량이 100g을 넘으면 1회제공량을 1조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-001', menuName: '테스트 피자', category: '피자' }],
      rawMap: {
        'P-001__석쇠L': { weight: 1000, kcal: 200, sugar: 8, protein: 16, fat: 4, sodium: 320 },
        'P-001__석쇠R': { weight: 640, kcal: 180, sugar: 8, protein: 18, fat: 3, sodium: 280 },
        'P-001__씬바사삭L': {
          weight: 720,
          kcal: 160,
          sugar: 6,
          protein: 16,
          fat: 2,
          sodium: 240,
        },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-001': { L: 8, R: 8 } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rows.some(row => row.crustLabel === '씬바샤삭' && row.side === 'R')).toBe(false);
    expect(rows[0].rows[0]).toMatchObject({
      crustLabel: '석쇠',
      side: 'L',
      slice: 8,
      servingLabel: '1조각',
      totalWeight: 1000,
      weight: 125,
      kcal: 250,
      sugar: 10,
      protein: 20,
      fat: 5,
      sodium: 400,
      servingTrace: expect.objectContaining({
        status: 'ok',
        totalWeight: 1000,
        sliceCount: 8,
        perSliceWeight: 125,
        servingSlices: 1,
      }),
    });
  });

  test('1조각 중량이 정확히 100g이면 1조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-100', menuName: '경계값 피자', category: '피자' }],
      rawMap: {
        'P-100__석쇠L': { weight: 800, kcal: 100, sugar: 1, protein: 2, fat: 1, sodium: 50 },
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
      servingTrace: expect.objectContaining({ perSliceWeight: 100, servingSlices: 1 }),
    });
  });

  test('1조각 중량이 100g 이하이고 2조각 중량도 100g 밑이면 3조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-LOW', menuName: '저중량 피자', category: '피자' }],
      rawMap: {
        'P-LOW__석쇠L': { weight: 320, kcal: 200, sugar: 10, protein: 20, fat: 5, sodium: 200 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-LOW': { L: 8 } },
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '3조각',
      totalWeight: 320,
      weight: 120,
      kcal: 240,
      sugar: 12,
      protein: 24,
      fat: 6,
      sodium: 240,
      servingTrace: expect.objectContaining({ perSliceWeight: 40, servingSlices: 3 }),
    });
  });

  test('1조각 중량은 100g 이하이고 2조각 중량은 100g 이상이면 2조각으로 만든다', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-MID', menuName: '중간중량 피자', category: '피자' }],
      rawMap: {
        'P-MID__석쇠L': { weight: 600, kcal: 200, sugar: 8, protein: 16, fat: 4, sodium: 200 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-MID': { L: 8 } },
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '2조각',
      totalWeight: 600,
      weight: 150,
      kcal: 300,
      sugar: 12,
      protein: 24,
      fat: 6,
      sodium: 300,
      servingTrace: expect.objectContaining({ perSliceWeight: 75, servingSlices: 2 }),
    });
  });

  test('2조각 중량이 정확히 100g이면 3조각이 아니라 2조각으로 만든다 (경계값)', () => {
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-EDGE-100', menuName: '2조각 경계값 피자', category: '피자' }],
      rawMap: {
        'P-EDGE-100__석쇠L': { weight: 400, kcal: 200, sugar: 8, protein: 16, fat: 4, sodium: 200 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-EDGE-100': { L: 8 } },
    });

    expect(rows[0].rows[0]).toMatchObject({
      servingLabel: '2조각',
      totalWeight: 400,
      weight: 100,
      kcal: 200,
      sugar: 8,
      protein: 16,
      fat: 4,
      sodium: 200,
      servingTrace: expect.objectContaining({ perSliceWeight: 50, servingSlices: 2 }),
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
      totalWeight: '—',
      weight: '—',
      kcal: '—',
      sugar: '—',
      protein: '—',
      fat: '—',
      sodium: '—',
      servingTrace: expect.objectContaining({
        status: 'missing',
        reason: 'missing-weight-or-kcal',
      }),
    });
  });

  test('엣지 조각 기준은 베이스 한판 총량 + 엣지 절대 총량을 합산해 조각수로 나눈다', () => {
    // 실제 신고 시나리오: 한판 1000g(100g당 200kcal → 총 2000kcal) + 치즈링 170g/총 459kcal.
    // 정답은 (2000+459) ÷ 8조각 = 307kcal. 과거 밀도 합산 방식이면 687kcal로 부풀려졌다.
    const rows = buildPizzaSliceSheet({
      menus: [{ menuCode: 'P-EDGE-W', menuName: '엣지 중량 피자', category: '피자' }],
      rawMap: {
        'P-EDGE-W__석쇠L': {
          weight: 1000,
          kcal: 200,
          sugar: 8,
          protein: 16,
          fat: 4,
          sodium: 320,
        },
      },
      edgeMap: {
        치즈크러스트L: {
          weight: 170,
          kcal: 459,
          sugar: 2,
          protein: 29,
          fat: 22,
          sodium: 1559,
        },
      },
      masterByCode: {},
      menuAllergenMap,
      edgeAllergenMap: new Map(),
      sliceCounts: { 'P-EDGE-W': { L: 8 } },
    });

    const edgeRow = rows[0].rows.find(row => row.crustLabel === '치즈크러스트' && row.side === 'L');
    expect(edgeRow).toMatchObject({
      servingLabel: '1조각',
      totalWeight: 1170,
      weight: 146,
      kcal: 307,
      sugar: 10,
      protein: 24,
      fat: 8,
      sodium: 595,
      servingTrace: expect.objectContaining({
        totalWeight: 1170,
        sliceCount: 8,
        perSliceWeight: 146,
        servingSlices: 1,
      }),
    });
  });
});

describe('buildPizzaSheet', () => {
  test('엣지 영양성분은 베이스 한판 총량에 엣지 절대 총량을 합산해 150g 기준으로 환산하고 씬바샤삭은 별도 입력값을 쓴다', () => {
    const rows = buildPizzaSheet({
      menus: [{ menuCode: 'P-NUTRI-EDGE', menuName: '엣지 영양 피자', category: '피자' }],
      rawMap: {
        'P-NUTRI-EDGE__석쇠L': {
          weight: 800,
          kcal: 200,
          sugar: 10,
          protein: 20,
          fat: 5,
          sodium: 300,
        },
        'P-NUTRI-EDGE__석쇠R': {
          weight: 600,
          kcal: 180,
          sugar: 8,
          protein: 18,
          fat: 4,
          sodium: 250,
        },
        'P-NUTRI-EDGE__씬바사삭L': {
          weight: 700,
          kcal: 160,
          sugar: 6,
          protein: 16,
          fat: 3,
          sodium: 220,
        },
      },
      edgeMap: {
        치즈크러스트L: { kcal: 20, sugar: 2, protein: 3, fat: 1, sodium: 40 },
        골드스윗R: { kcal: 30, sugar: 5, protein: 1, fat: 2, sodium: 30 },
      },
      masterByCode: {},
      menuAllergenMap,
      edgeAllergenMap: new Map(),
    });

    const sheetRows = rows[0].rows;
    expect(sheetRows.find(row => row.crustLabel === '석쇠' && row.side === 'L')).toMatchObject({
      weight: 150,
      kcal: 300,
      sugar: 15,
      protein: 30,
      fat: 8,
      sodium: 450,
    });
    // 치즈크러스트L: 엣지 절대 총량(kcal 20 등)이 한판 총량(1600kcal 등)에 더해진 뒤 150g 기준 환산.
    expect(
      sheetRows.find(row => row.crustLabel === '치즈크러스트' && row.side === 'L')
    ).toMatchObject({
      weight: 150,
      kcal: 304,
      sugar: 15,
      protein: 31,
      fat: 8,
      sodium: 458,
    });
    expect(sheetRows.find(row => row.crustLabel === '골드스윗' && row.side === 'R')).toMatchObject({
      weight: 150,
      kcal: 278,
      sugar: 13,
      protein: 27,
      fat: 6,
      sodium: 383,
    });
    expect(sheetRows.find(row => row.crustLabel === '씬바샤삭' && row.side === 'L')).toMatchObject({
      weight: 150,
      kcal: 240,
      sugar: 9,
      protein: 24,
      fat: 5,
      sodium: 330,
    });
  });

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

  test('출력 포화지방 컬럼은 satFat 값을 우선 사용하고 없으면 fat으로 보정한다', () => {
    const rows = buildPizzaSheet({
      menus: [{ menuCode: 'P-SAT', menuName: '포화지방 피자', category: '피자' }],
      rawMap: {
        'P-SAT__석쇠L': {
          weight: 100,
          kcal: 100,
          sugar: 1,
          protein: 2,
          fat: 99,
          satFat: 3,
          sodium: 10,
        },
        'P-SAT__석쇠R': {
          weight: 100,
          kcal: 90,
          sugar: 1,
          protein: 2,
          fat: 4,
          sodium: 10,
        },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      edgeAllergenMap: new Map(),
    });

    const sheetRows = rows[0].rows;
    expect(sheetRows.find(row => row.crustLabel === '석쇠' && row.side === 'L').fat).toBe(5);
    expect(sheetRows.find(row => row.crustLabel === '석쇠' && row.side === 'R').fat).toBe(6);
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
    expect(rows[1].rows[0]).toMatchObject({ crustLabel: '씬바샤삭', side: 'L' });
  });
});

describe('buildSetHalfSheet', () => {
  test('세트박스 행은 계산된 중량 범위를 출력한다', () => {
    const rows = buildSetHalfSheet({
      menus: [
        { menuCode: 'P-A', menuName: '가 피자', category: '피자' },
        { menuCode: 'P-B', menuName: '나 피자', category: '피자' },
        { menuCode: 'S-1', menuName: '사이드', category: '사이드' },
      ],
      rawMap: {
        'P-A__석쇠L': { weight: 100, kcal: 100 },
        'P-B__석쇠L': { weight: 120, kcal: 200 },
        'S-1__단품': { weight: 80, kcal: 10 },
      },
      edgeMap: {
        치즈크러스트L: { weight: 20, kcal: 50 },
      },
      masterByCode: {},
      menuAllergenMap,
      setComps: [
        {
          kind: 'set',
          setName: '테스트',
          setSide: 'L',
          slots: [{ label: '사이드', menuCodes: ['S-1'] }],
        },
      ],
    });

    // max = 나 피자 총 240kcal + 치즈크러스트 절대 총량 50kcal + 사이드 8kcal = 298
    expect(rows.find(row => row.kind === 'set')).toMatchObject({
      menuName: '테스트 L세트',
      weight: '180~220',
      minKcal: 108,
      maxKcal: 298,
    });
  });
});

describe('buildBeverageSheet', () => {
  test('음료는 g 중량 대신 파싱한 용량 ml 기준으로 환산한다', () => {
    const rows = buildBeverageSheet({
      menus: [{ menuCode: 'D-COLA', menuName: '콜라 1.25L', category: '음료' }],
      rawMap: {
        'D-COLA__석쇠L': { kcal: 40, sugar: 9, protein: 0, fat: 0, sodium: 5 },
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
        fat: 0,
        sodium: 63,
      }),
    ]);
  });

  test('음료 출력도 satFat 값을 포화지방 컬럼에 우선 반영한다', () => {
    const rows = buildBeverageSheet({
      menus: [{ menuCode: 'D-ZERO', menuName: '제로콜라 500ml', category: '음료' }],
      rawMap: {
        'D-ZERO__석쇠L': { kcal: 0, sugar: 0, protein: 0, fat: 9, satFat: 0.2, sodium: 1 },
      },
      masterByCode: {},
      menuAllergenMap,
    });

    expect(rows[0]).toMatchObject({
      weight: 500,
      fat: 1,
    });
  });
});

describe('buildSideSheet', () => {
  test('사이드 메뉴는 단품 슬롯의 영양값을 우선 사용한다', () => {
    const rows = buildSideSheet({
      menus: [{ menuCode: 'S-WING', menuName: '핫윙', category: '사이드' }],
      rawMap: {
        'S-WING__단품': {
          basis: 'serving',
          weight: 120,
          kcal: 250,
          sugar: 1,
          protein: 12,
          fat: 8,
          sodium: 500,
        },
        'S-WING__석쇠L': {
          basis: 'serving',
          weight: 1,
          kcal: 1,
        },
      },
      masterByCode: {},
      menuAllergenMap,
    });

    expect(rows[0]).toMatchObject({
      menuCode: 'S-WING',
      weight: 120,
      kcal: 250,
      protein: 12,
      fat: 8,
      sodium: 500,
    });
  });

  test('사이드 단품 출력은 satFat이 있으면 포화지방 컬럼에 사용한다', () => {
    const rows = buildSideSheet({
      menus: [{ menuCode: 'S-SAT', menuName: '포화지방 사이드', category: '사이드' }],
      rawMap: {
        'S-SAT__단품': {
          basis: 'serving',
          weight: 120,
          kcal: 250,
          sugar: 1,
          protein: 12,
          fat: 99,
          satFat: 2.4,
          sodium: 500,
        },
      },
      masterByCode: {},
      menuAllergenMap,
    });

    expect(rows[0].fat).toBe(2);
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
          fat: 0.4,
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
        fat: 0,
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
          fat: 0,
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

  test('추가토핑 출력도 satFat을 포화지방 컬럼에 우선 사용한다', () => {
    const rows = buildToppingSheet({
      menus: [],
      rawMap: {},
      masterByCode: {},
      menuAllergenMap,
      toppings: [
        {
          toppingCode: 'TOP-SAT',
          toppingName: '포화지방 토핑',
          weight: 30,
          kcal: 20,
          sugar: 0,
          protein: 1,
          fat: 9,
          satFat: 1.6,
          sodium: 5,
        },
      ],
      toppingAllergenMap: new Map(),
    });

    expect(rows[0].fat).toBe(2);
  });
});
