import { describe, expect, test } from '@jest/globals';
import {
  hasNutritionValue,
  buildNutritionMissingValueDiagnostics,
} from '../../lib/nutrition/missing-values.js';

describe('hasNutritionValue', () => {
  test('값이 하나라도 있으면 true', () => {
    expect(hasNutritionValue({ kcal: 250 })).toBe(true);
    expect(hasNutritionValue({ protein: 0 })).toBe(true); // 0도 입력값
  });
  test('빈 행/빈 문자열/null은 false', () => {
    expect(hasNutritionValue({})).toBe(false);
    expect(hasNutritionValue({ kcal: '', protein: null })).toBe(false);
    expect(hasNutritionValue(null)).toBe(false);
  });
});

describe('buildNutritionMissingValueDiagnostics', () => {
  const menus = [
    { menuCode: 'P-001', menuName: '페퍼로니' },
    { menuCode: 'P-002', menuName: '치즈' },
    { menuCode: 'P-003', menuName: '불고기' },
  ];

  test('어떤 크러스트에도 값이 없는 메뉴만 미입력으로 진단', () => {
    const rawMap = {
      'P-001__오리지널': { kcal: 250 }, // 값 있음
      'P-001__씬': {}, // 빈 행이지만 P-001은 다른 크러스트에 값 있음
      'P-002__오리지널': {}, // 전부 빈 값 → 미입력
      // P-003은 rawMap에 아예 없음 → 미입력
    };
    const result = buildNutritionMissingValueDiagnostics({ menus, rawMap });
    expect(result.missingCount).toBe(2);
    expect(result.missingMenus.map(m => m.menuCode).sort()).toEqual(['P-002', 'P-003']);
  });

  test('전부 입력되면 missingCount 0', () => {
    const rawMap = {
      'P-001__오리지널': { kcal: 1 },
      'P-002__씬': { protein: 1 },
      'P-003__오리지널': { weight: 1 },
    };
    expect(buildNutritionMissingValueDiagnostics({ menus, rawMap }).missingCount).toBe(0);
  });

  test('rawMap 비었으면 모든 메뉴가 미입력', () => {
    expect(buildNutritionMissingValueDiagnostics({ menus, rawMap: {} }).missingCount).toBe(3);
  });

  test('잘못된 입력에 안전(빈 결과)', () => {
    expect(buildNutritionMissingValueDiagnostics({}).missingCount).toBe(0);
    expect(buildNutritionMissingValueDiagnostics().missingCount).toBe(0);
  });

  test('중복 menuCode는 한 번만 집계', () => {
    const dup = [
      { menuCode: 'P-009', menuName: 'A' },
      { menuCode: 'P-009', menuName: 'A' },
    ];
    expect(buildNutritionMissingValueDiagnostics({ menus: dup, rawMap: {} }).missingCount).toBe(1);
  });
});
