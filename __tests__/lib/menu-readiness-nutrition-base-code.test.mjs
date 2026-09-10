import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

/**
 * 출시 준비(readiness)의 "영양성분" 차원이 사이즈 있는 메뉴를 전부 "미입력"으로
 * 오탐하던 버그 회귀 확인. nutrition_raw_values는 base 코드(사이즈 접미사 없음)로
 * 저장되는데, 메뉴마스터의 menuCode(full, 예: P-PS-001-L)와 그대로 비교해
 * 정상 입력된 메뉴도 전부 누락으로 잘못 표시됐다.
 * (lib/nutrition/menu-master-diagnostics.js의 반대 방향 버그와 같은 원인.)
 */
describe('readiness 영양성분 체크 — base 코드 폴백', () => {
  test('checkNutrition이 사이즈 접미사를 벗겨낸 base 코드로도 조회한다', () => {
    const s = src('lib/menu-master/readiness.js');
    expect(s).toContain('function stripSizeSuffix(code)');
    expect(s).toContain(
      'if (!rawValueMenuCodes.has(menuCode) && !rawValueMenuCodes.has(stripSizeSuffix(menuCode)))'
    );
  });
});
