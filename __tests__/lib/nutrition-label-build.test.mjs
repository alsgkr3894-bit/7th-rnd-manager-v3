import { describe, expect, test } from '@jest/globals';
import {
  buildBeverageSheet,
  buildPizzaSliceSheet,
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
        'P-001__씬바사삭L': { weight: 720, kcal: 160, sugar: 6, protein: 16, satFat: 2, sodium: 240 },
      },
      edgeMap: {},
      masterByCode: {},
      menuAllergenMap,
      sliceCounts: { 'P-001': { L: 8, R: 8 } },
    });

    expect(rows).toHaveLength(1);
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

  test('1조각 열량이 100kcal 이하이면 100kcal를 처음 넘는 조각수로 만든다', () => {
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
        sugar: 112.5,
        protein: 0,
        satFat: 0,
        sodium: 62.5,
      }),
    ]);
  });
});
