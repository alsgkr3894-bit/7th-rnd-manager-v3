/**
 * 불변식 테스트 — lib/nutrition/crust-config.js
 *
 * 목적: 미래에 크러스트/엣지 상수를 수정할 때 SIDE_BASE_CRUST·EDGE_VARIANTS가
 * CRUST_TYPES·EDGE_CODES와 드리프트(어긋남)하는 즉시 여기서 실패하도록 한다.
 * DB·React 의존 없음 — 순수 상수만 다루므로 mock 불필요.
 */

import { describe, test, expect } from '@jest/globals';
import {
  CRUST_TYPES,
  CRUST_DISPLAY_NAMES,
  EDGE_CODES,
  EDGE_NAMES,
  EDGE_VARIANTS,
  NUTRITION_EDGE_GROUPS,
  SIDE_BASE_CRUST,
  ALLERGEN_CRUST_VARIANTS,
  THIN_CRUST_CODE,
  THIN_CRUST_KEY,
  THIN_CRUST_LABEL,
  DOUGH_CATEGORY_PREFIX,
  isThinCrustLabel,
  isDoughCategory,
  isNutritionPizzaCategory,
  isPizzaCategory,
} from '../../lib/nutrition/crust-config.js';

// ── 상수 구조 불변식 ────────────────────────────────────────────

describe('CRUST_TYPES', () => {
  test('배열이고 비어있지 않다', () => {
    expect(Array.isArray(CRUST_TYPES)).toBe(true);
    expect(CRUST_TYPES.length).toBeGreaterThan(0);
  });

  test('모든 항목이 문자열이다', () => {
    CRUST_TYPES.forEach(ct => expect(typeof ct).toBe('string'));
  });

  test('모든 CRUST_TYPES에 표시명이 있다', () => {
    CRUST_TYPES.forEach(ct => expect(typeof CRUST_DISPLAY_NAMES[ct]).toBe('string'));
  });
});

describe('EDGE_CODES / EDGE_NAMES', () => {
  test('EDGE_NAMES 키 집합 === EDGE_CODES 집합', () => {
    const codeSet = new Set(EDGE_CODES);
    const nameSet = new Set(Object.keys(EDGE_NAMES));
    expect(codeSet).toEqual(nameSet);
  });

  test('모든 EDGE_NAMES 값이 문자열이다', () => {
    Object.values(EDGE_NAMES).forEach(v => expect(typeof v).toBe('string'));
  });
});

describe('SIDE_BASE_CRUST — CRUST_TYPES와 동기화 불변식', () => {
  test('SIDE_BASE_CRUST.L 이 CRUST_TYPES에 속한다', () => {
    expect(CRUST_TYPES).toContain(SIDE_BASE_CRUST.L);
  });

  test('SIDE_BASE_CRUST.R 이 CRUST_TYPES에 속한다', () => {
    expect(CRUST_TYPES).toContain(SIDE_BASE_CRUST.R);
  });

  test('L과 R이 서로 다르다', () => {
    expect(SIDE_BASE_CRUST.L).not.toBe(SIDE_BASE_CRUST.R);
  });
});

describe('EDGE_VARIANTS — EDGE_CODES와 동기화 불변식', () => {
  const codeSet = new Set(EDGE_CODES);

  test('모든 edgeCode가 EDGE_CODES에 속한다', () => {
    EDGE_VARIANTS.forEach(v => expect(codeSet).toContain(v.edgeCode));
  });

  test('모든 side가 L 또는 R이다', () => {
    EDGE_VARIANTS.forEach(v => expect(['L', 'R']).toContain(v.side));
  });

  test('crustType과 edgeCode가 일치한다 (L/R suffix 포함)', () => {
    EDGE_VARIANTS.forEach(v => expect(v.crustType).toBe(v.edgeCode));
  });

  test('EDGE_CODES 전체를 커버한다 (누락 없음)', () => {
    const variantCodes = new Set(EDGE_VARIANTS.map(v => v.edgeCode));
    expect(variantCodes).toEqual(codeSet);
  });
});

describe('NUTRITION_EDGE_GROUPS — 운영 기준 총엣지', () => {
  test('석쇠, 치즈크러스트, 골드스윗, 씬바샤삭 4개 그룹을 가진다', () => {
    expect(NUTRITION_EDGE_GROUPS.map(group => group.label)).toEqual([
      '석쇠',
      '치즈크러스트',
      '골드스윗',
      '씬바샤삭',
    ]);
  });

  test('씬바샤삭은 L 사이즈만 가진다', () => {
    const thin = NUTRITION_EDGE_GROUPS.find(group => group.key === 'thin');
    expect(thin.entries).toEqual([{ size: 'L', crustType: THIN_CRUST_CODE }]);
  });

  test('치즈크러스트와 골드스윗만 엣지 조정값 입력 대상이다', () => {
    const adjustmentGroups = NUTRITION_EDGE_GROUPS.filter(
      group => group.inputType === 'edgeAdjustment'
    );
    expect(adjustmentGroups.map(group => group.label)).toEqual(['치즈크러스트', '골드스윗']);
    adjustmentGroups
      .flatMap(group => group.entries)
      .forEach(entry => expect(EDGE_CODES).toContain(entry.edgeCode));
  });
});

describe('THIN_CRUST display policy', () => {
  test('내부 키는 유지하고 사용자 표시명은 씬바샤삭을 쓴다', () => {
    expect(THIN_CRUST_KEY).toBe('씬바사삭');
    expect(THIN_CRUST_CODE).toBe('씬바사삭L');
    expect(THIN_CRUST_LABEL).toBe('씬바샤삭');
    expect(CRUST_DISPLAY_NAMES[THIN_CRUST_CODE]).toBe('씬바샤삭 L');
  });

  test('구표기와 현표기 모두 씬바샤삭 계열로 인식한다', () => {
    expect(isThinCrustLabel('씬바사삭')).toBe(true);
    expect(isThinCrustLabel('씬바샤삭')).toBe(true);
  });
});

describe('ALLERGEN_CRUST_VARIANTS', () => {
  test('배열이고 비어있지 않다', () => {
    expect(Array.isArray(ALLERGEN_CRUST_VARIANTS)).toBe(true);
    expect(ALLERGEN_CRUST_VARIANTS.length).toBeGreaterThan(0);
  });

  test('각 항목에 key · label · edgeType 필드가 있다', () => {
    ALLERGEN_CRUST_VARIANTS.forEach(v => {
      expect(typeof v.key).toBe('string');
      expect(typeof v.label).toBe('string');
      expect('edgeType' in v).toBe(true); // null도 허용
    });
  });

  test('첫 번째 항목(기본 석쇠)은 edgeType이 null이다', () => {
    expect(ALLERGEN_CRUST_VARIANTS[0].edgeType).toBeNull();
  });
});

// ── isDoughCategory ─────────────────────────────────────────────

describe('isDoughCategory', () => {
  test("'도우/밀가루' → true", () => {
    expect(isDoughCategory('도우/밀가루')).toBe(true);
  });

  test("'도우' 단독 → true", () => {
    expect(isDoughCategory('도우')).toBe(true);
  });

  test("'도우크림' → true (startsWith 동작 보존)", () => {
    expect(isDoughCategory('도우크림')).toBe(true);
  });

  test("'토핑재료' → false", () => {
    expect(isDoughCategory('토핑재료')).toBe(false);
  });

  test('빈 문자열 → false', () => {
    expect(isDoughCategory('')).toBe(false);
  });

  test('null → false', () => {
    expect(isDoughCategory(null)).toBe(false);
  });

  test('undefined → false', () => {
    expect(isDoughCategory(undefined)).toBe(false);
  });

  test('DOUGH_CATEGORY_PREFIX와 정합 — prefix가 바뀌면 이 테스트도 실패해야 함', () => {
    expect(isDoughCategory(DOUGH_CATEGORY_PREFIX)).toBe(true);
    expect(isDoughCategory(DOUGH_CATEGORY_PREFIX + '/추가')).toBe(true);
  });
});

// ── isNutritionPizzaCategory ────────────────────────────────────

describe('isNutritionPizzaCategory', () => {
  test("'피자' → true", () => {
    expect(isNutritionPizzaCategory('피자')).toBe(true);
  });

  test("'피자/프리미엄' → true", () => {
    expect(isNutritionPizzaCategory('피자/프리미엄')).toBe(true);
  });

  test("'사이드' → false", () => {
    expect(isNutritionPizzaCategory('사이드')).toBe(false);
  });

  test('null → false', () => {
    expect(isNutritionPizzaCategory(null)).toBe(false);
  });

  test('undefined → false', () => {
    expect(isNutritionPizzaCategory(undefined)).toBe(false);
  });

  test('기존 isPizzaCategory alias를 유지한다', () => {
    expect(isPizzaCategory).toBe(isNutritionPizzaCategory);
  });
});
