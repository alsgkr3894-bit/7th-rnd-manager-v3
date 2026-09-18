import { describe, expect, test } from '@jest/globals';
import { buildMenuNutritionPreview } from '../../lib/nutrition/label/menu-preview.js';

function baseCtx(overrides = {}) {
  return {
    menuRefs: [],
    rawMap: {},
    edgeMap: {},
    masterByCode: {},
    menuAllergenMap: new Map(),
    edgeAllergenMap: new Map(),
    toppingAllergenMap: new Map(),
    toppings: [],
    ...overrides,
  };
}

describe('buildMenuNutritionPreview', () => {
  test('피자 메뉴는 사이즈 접미사를 base 코드로 벗겨 nutrition_menu_ref와 매칭한다', () => {
    const ctx = baseCtx({
      menuRefs: [{ menuCode: 'P-PS-002', menuName: '체다골드포테이토 피자', category: '피자' }],
      rawMap: {
        'P-PS-002__석쇠L': { weight: 150, kcal: 300 },
      },
      masterByCode: {
        'P-PS-002-L': { category: '피자' },
      },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'P-PS-002-L',
      menuName: '체다골드포테이토 피자',
      category: '피자',
    });

    expect(result.supported).toBe(true);
    expect(result.group).toBe('피자');
    // buildPizzaSheet의 { menuName, menuCode, rows:[...] } 묶음이 아니라
    // 풀어헤친 크러스트별 행(crustLabel/side/weight/kcal/...)이어야 한다.
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0]).toHaveProperty('crustLabel');
    expect(result.rows[0]).toHaveProperty('side');
    expect(result.rows[0]).toHaveProperty('weight', 150);
    // raw는 100g 기준(kcal:300) → 150g로 스케일되어 450이 된다(scaledCols).
    expect(result.rows.some(row => row.kcal === 450)).toBe(true);
  });

  test('nutrition_menu_ref에 대응 항목이 없으면 missing:true를 반환한다', () => {
    const ctx = baseCtx({
      masterByCode: { 'S-HH-001': { category: '사이드' } },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'S-HH-001',
      menuName: '등록 안 된 사이드',
      category: '사이드',
    });

    expect(result.supported).toBe(true);
    expect(result.group).toBe('사이드');
    expect(result.rows).toEqual([]);
    expect(result.missing).toBe(true);
  });

  test('세트박스·하프앤하프는 개별 메뉴 미리보기를 지원하지 않는다', () => {
    const ctx = baseCtx({
      masterByCode: { 'SET-BOX-001': { category: '세트박스' } },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'SET-BOX-001',
      menuName: '세트박스A',
      category: '세트박스',
    });

    expect(result.supported).toBe(false);
    expect(result.group).toBe('세트박스');
  });

  test('추가토핑은 nutrition_topping_master를 코드 또는 이름으로 매칭한다', () => {
    const ctx = baseCtx({
      toppings: [{ toppingCode: 'ET-001', toppingName: '치즈 80g', productCode: 'PC-1' }],
      masterByCode: { 'T-ETC-001': { category: '추가토핑' } },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'T-ETC-001',
      menuName: '치즈 80g',
      category: '추가토핑',
    });

    expect(result.supported).toBe(true);
    expect(result.group).toBe('추가토핑');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].menuName).toBe('치즈 80g');
  });

  test('추가토핑 매칭 실패 시 missing:true를 반환한다', () => {
    const ctx = baseCtx({
      toppings: [{ toppingCode: 'ET-001', toppingName: '치즈 80g' }],
      masterByCode: { 'T-ETC-099': { category: '추가토핑' } },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'T-ETC-099',
      menuName: '아직 안 만든 토핑',
      category: '추가토핑',
    });

    expect(result.supported).toBe(true);
    expect(result.missing).toBe(true);
    expect(result.rows).toEqual([]);
  });

  test('토핑에 linkedMenuCode가 있으면 이름이 달라도 그 코드로만 매칭한다', () => {
    const ctx = baseCtx({
      toppings: [
        { toppingCode: 'ET-001', toppingName: '까망베르 치즈', menuCode: 'T-ETC-001' },
        // 이름이 비슷해도 다른 메뉴에 명시적으로 연결된 토핑은 매칭되면 안 된다.
        { toppingCode: 'ET-002', toppingName: '치즈 100g', menuCode: 'T-ETC-002' },
      ],
      masterByCode: { 'T-ETC-001': { category: '추가토핑' } },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'T-ETC-001',
      menuName: '치즈 100g', // menu_master 이름은 다르게 등록돼 있어도
      category: '추가토핑',
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].menuName).toBe('까망베르 치즈');
  });

  test('추가토핑 이름 매칭은 공백 위치·대소문자 차이를 무시한다', () => {
    const ctx = baseCtx({
      toppings: [{ toppingCode: 'ET-004', toppingName: '블랙올리브32개 (32g)' }],
      masterByCode: { 'T-ETC-004': { category: '추가토핑' } },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'T-ETC-004',
      menuName: '블랙올리브 32개(32g)',
      category: '추가토핑',
    });

    expect(result.rows).toHaveLength(1);
  });
});

describe('buildMenuNutritionPreview — 엣지(크러스트) 카테고리', () => {
  test('치즈크러스트는 nutrition_edge_master의 L/R 값을 크러스트별 행으로 반환한다', () => {
    const ctx = baseCtx({
      edgeMap: {
        치즈크러스트L: { edgeCode: '치즈크러스트L', weight: 170, kcal: 459, satFat: 21.76 },
        치즈크러스트R: { edgeCode: '치즈크러스트R', weight: 140, kcal: 378, satFat: 17.92 },
      },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'OPT-EDGE-002',
      menuName: '치즈크러스트',
      category: '엣지',
    });

    expect(result.supported).toBe(true);
    expect(result.group).toBe('엣지');
    expect(result.missing).toBe(false);
    expect(result.note).toBeTruthy();
    expect(result.rows).toHaveLength(2);
    const bySide = Object.fromEntries(result.rows.map(row => [row.side, row]));
    // 'fat' 열은 satFat만 쓰고(labelFieldValue) 정수로 반올림한다(roundLabelValue) — 21.76→22.
    expect(bySide.L).toMatchObject({ crustLabel: '치즈크러스트', weight: 170, kcal: 459, fat: 22 });
    expect(bySide.R).toMatchObject({ crustLabel: '치즈크러스트', weight: 140, kcal: 378, fat: 18 });
  });

  test('골드스윗은 edgeMap에 값이 없으면 missing:true를 반환한다', () => {
    const ctx = baseCtx();

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'OPT-EDGE-003',
      menuName: '골드스윗',
      category: '엣지',
    });

    expect(result.supported).toBe(true);
    expect(result.group).toBe('엣지');
    expect(result.missing).toBe(true);
    expect(result.rows).toEqual([]);
  });

  test('석쇠·씬바사삭은 베이스 크러스트라 미리보기를 지원하지 않는다', () => {
    const stoneResult = buildMenuNutritionPreview(baseCtx(), {
      menuCode: 'OPT-EDGE-001',
      menuName: '석쇠',
      category: '엣지',
    });
    const thinResult = buildMenuNutritionPreview(baseCtx(), {
      menuCode: 'OPT-EDGE-004',
      menuName: '씬바사삭',
      category: '엣지',
    });

    expect(stoneResult).toEqual({ supported: false, group: '엣지', rows: [] });
    expect(thinResult).toEqual({ supported: false, group: '엣지', rows: [] });
  });

  test('edgeKey 오버라이드가 이름 자동 판정보다 우선한다', () => {
    const ctx = baseCtx({
      edgeMap: {
        골드스윗L: { edgeCode: '골드스윗L', weight: 190, kcal: 539.11 },
        골드스윗R: { edgeCode: '골드스윗R', weight: 145, kcal: 411.42 },
      },
    });

    const result = buildMenuNutritionPreview(ctx, {
      menuCode: 'OPT-EDGE-999',
      menuName: '이름만으론 알 수 없는 엣지',
      category: '엣지',
      edgeKey: '골드스윗',
    });

    expect(result.supported).toBe(true);
    expect(result.rows).toHaveLength(2);
  });
});
