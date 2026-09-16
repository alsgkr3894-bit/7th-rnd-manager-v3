import { describe, expect, test } from '@jest/globals';
import { defaultSlices, resolveSlices } from '../../lib/nutrition/slice-config.js';

describe('피자 기본 조각수', () => {
  test('일반 피자는 L 8조각, R 6조각', () => {
    expect(defaultSlices({ menuCode: 'PZ-01', menuName: '슈퍼콤비네이션 피자' })).toEqual({
      L: 8,
      R: 6,
    });
  });

  test('1인용 피자는 L/R 모두 6조각', () => {
    expect(defaultSlices({ menuCode: 'P-ONE-01', menuName: '하와이안 피자' })).toEqual({
      L: 6,
      R: 6,
    });
    expect(defaultSlices({ menuCode: 'X', category: '1인피자' }, {})).toEqual({ L: 6, R: 6 });
  });

  test('resolveSlices — 오버라이드가 없으면 기본값(R=6), 있으면 오버라이드 우선', () => {
    const menu = { menuCode: 'PZ-01', menuName: '슈퍼콤비네이션 피자' };
    expect(resolveSlices('PZ-01', 'L', {}, menu)).toBe(8);
    expect(resolveSlices('PZ-01', 'R', {}, menu)).toBe(6);
    expect(resolveSlices('PZ-01', 'R', { 'PZ-01': { R: 8 } }, menu)).toBe(8);
    // 0/빈 오버라이드는 무시하고 기본값
    expect(resolveSlices('PZ-01', 'R', { 'PZ-01': { R: '' } }, menu)).toBe(6);
    expect(resolveSlices('PZ-01', 'R', { 'PZ-01': { R: 0 } }, menu)).toBe(6);
  });
});
