import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { calcAllResults, combineBaseWithEdge } from '../../lib/nutrition/values/calc.js';
import { REGULAR_PIZZA_CRUST_TYPES, CRUST_TYPES } from '../../lib/nutrition/crust-config.js';

// 2026-09-30 전체 점검(영양성분 영역 버그 헌트)에서 나온 것들.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('1인용피자 슬롯', () => {
  test('일반 피자 크러스트에는 1인용피자 슬롯이 없다', () => {
    expect(REGULAR_PIZZA_CRUST_TYPES).toEqual(['석쇠L', '석쇠R', '씬바사삭L']);
    expect(CRUST_TYPES).toContain('1인용피자'); // 저장 키 호환은 그대로
  });

  const master = {
    'P-OR-006-L': { category: '피자/오리지널' },
    'P-ONE-001': { category: '1인피자' },
  };
  const results = calcAllResults({
    menus: [
      { menuCode: 'P-OR-006-L', menuName: '페페로니 피자' },
      { menuCode: 'P-ONE-001', menuName: '페페로니 피자(1인)' },
    ],
    rawMap: { 'P-ONE-001__1인용피자': { weight: 150, kcal: 400 } },
    edgeMap: {},
    compositions: [],
    masterByCode: master,
  });

  test('일반 피자는 베이스 3종 + 엣지 행뿐(1인용피자 가짜 행 없음)', () => {
    const regular = results.filter(r => r.menuCode === 'P-OR-006-L');
    expect(regular.some(r => r.crustType === '1인용피자')).toBe(false);
    expect(regular.slice(0, 3).map(r => r.crustType)).toEqual(['석쇠L', '석쇠R', '씬바사삭L']);
  });

  test('1인용피자는 전용 슬롯 한 행뿐(석쇠·씬·엣지 7행이 누락으로 잡히지 않는다)', () => {
    const personal = results.filter(r => r.menuCode === 'P-ONE-001');
    expect(personal).toHaveLength(1);
    expect(personal[0]).toMatchObject({ crustType: '1인용피자', weight: 150, kcal: 400 });
  });
});

describe('엣지 합산', () => {
  test('베이스 값이 비어 있으면 엣지 값만으로 100g 값을 지어내지 않는다', () => {
    const r = combineBaseWithEdge(
      { weight: 1016, kcal: 260, carbs: '' },
      { weight: 170, kcal: 459, carbs: 7.65 }
    );
    expect(r.carbs).toBeUndefined();
    expect(r.kcal).toBeCloseTo((((260 * 1016) / 100 + 459) / 1186) * 100, 1);
  });

  test('엣지 조정값이 없으면(마스터 미입력) 석쇠 값을 복사하지 않고 빈 결과', () => {
    expect(combineBaseWithEdge({ weight: 1016, kcal: 260 }, {})).toEqual({});
    expect(combineBaseWithEdge({ weight: 1016, kcal: 260 }, undefined)).toEqual({});
  });

  test('엣지 값이 있으면 예전처럼 합산한다', () => {
    const r = combineBaseWithEdge({ weight: 1000, kcal: 200 }, { weight: 100, kcal: 300 });
    expect(r.weight).toBe(1100);
    expect(r.kcal).toBeCloseTo((((200 * 1000) / 100 + 300) / 1100) * 100, 1);
  });
});

describe('사이드 입력 기준', () => {
  test('피자가 아닌 메뉴는 전부 1회 제공량(serving)으로 저장하고 안내도 그렇게 한다', () => {
    expect(read('hooks/useNutritionBaseEditor.js')).toContain(
      "...(isServingMenu ? { basis: 'serving' } : {})"
    );
    const panel = read('components/nutrition/menu/base/NutritionInputPanel.jsx');
    expect(panel).toContain('사이드는');
    expect(panel).toContain('100g 기준으로 환산하지 않습니다');
  });
});

describe('고르곤졸라 대두 규칙은 출력용으로 바꾼 이름이 아니라 원래 메뉴명을 본다', () => {
  test('피자 시트의 알레르기 계산에 originalMenuName을 넘긴다', () => {
    const src = read('lib/nutrition/label/sheets/pizza.js');
    expect(src.split('menu.originalMenuName ?? menu.menuName').length - 1).toBe(4);
  });
});

describe('피자 목록 점·입력 슬롯', () => {
  test('일반 피자는 REGULAR_PIZZA_CRUST_TYPES를 쓴다', () => {
    expect(read('components/nutrition/menu/base/MenuGroupList.jsx')).toContain(
      '? REGULAR_PIZZA_CRUST_TYPES'
    );
    expect(read('components/nutrition/menu/base/NutritionInputPanel.jsx')).toContain(
      'isPizza ? REGULAR_PIZZA_CRUST_TYPES'
    );
  });
});
