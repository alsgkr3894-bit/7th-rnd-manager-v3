import { describe, expect, test } from '@jest/globals';
import {
  getChipBadgeStyle,
  getChipButtonStyle,
  getChipTextColor,
  normalizeChipActive,
  normalizeChipColor,
  normalizeChipCount,
  normalizeChipDim,
  normalizeChipLabel,
  normalizeChipOnClick,
} from '../../lib/ui/chip.js';

describe('chip ui helpers', () => {
  test('라벨은 표시 가능한 문자열로 보정한다', () => {
    expect(normalizeChipLabel('전체')).toBe('전체');
    expect(normalizeChipLabel(2026)).toBe('2026');
    expect(normalizeChipLabel({ label: 'bad' })).toBe('');
  });

  test('count는 문자열과 숫자만 배지 값으로 허용한다', () => {
    expect(normalizeChipCount(0)).toBe(0);
    expect(normalizeChipCount('12')).toBe('12');
    expect(normalizeChipCount(null)).toBeNull();
    expect(normalizeChipCount({ count: 1 })).toBeNull();
  });

  test('active와 dim은 boolean으로 보정한다', () => {
    expect(normalizeChipActive('yes')).toBe(true);
    expect(normalizeChipActive(0)).toBe(false);
    expect(normalizeChipDim(1)).toBe(true);
    expect(normalizeChipDim('')).toBe(false);
  });

  test('색상은 문자열만 사용하고 나머지는 기본값으로 보정한다', () => {
    expect(normalizeChipColor('var(--positive)')).toBe('var(--positive)');
    expect(normalizeChipColor({ color: 'bad' })).toBe('var(--text-2)');
  });

  test('텍스트 색상은 active, dim, custom color 순서로 결정한다', () => {
    expect(getChipTextColor({ active: true, dim: true, color: 'red' })).toBe('#fff');
    expect(getChipTextColor({ active: false, dim: true, color: 'red' })).toBe('var(--text-4)');
    expect(getChipTextColor({ active: false, dim: false, color: 'red' })).toBe('red');
  });

  test('버튼과 배지 스타일은 기존 표시 값을 유지한다', () => {
    expect(getChipButtonStyle({ active: true, dim: false })).toMatchObject({
      cursor: 'pointer',
      border: 'none',
      background: 'var(--accent)',
      color: '#fff',
      opacity: 1,
      display: 'inline-flex',
    });
    expect(getChipButtonStyle({ active: false, dim: true })).toMatchObject({
      background: 'var(--surface-2)',
      color: 'var(--text-4)',
      opacity: 0.7,
    });
    expect(getChipBadgeStyle(true)).toMatchObject({
      background: 'rgba(255,255,255,0.2)',
      color: '#fff',
      borderRadius: 10,
    });
    expect(getChipBadgeStyle(false)).toMatchObject({
      background: 'var(--surface)',
      color: 'var(--text-3)',
    });
  });

  test('onClick은 함수만 그대로 사용한다', () => {
    const handler = () => 'ok';
    expect(normalizeChipOnClick(handler)).toBe(handler);
    expect(normalizeChipOnClick(null)).toBeUndefined();
  });
});
