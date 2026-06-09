import { describe, expect, test } from '@jest/globals';
import {
  getSmallStatCardStyle,
  getSmallStatLabelStyle,
  getSmallStatUnitStyle,
  getSmallStatValueStyle,
  normalizeSmallStatLabel,
  normalizeSmallStatUnit,
  normalizeSmallStatValue,
  normalizeSmallStatValueColor,
} from '../../lib/ui/small-stat-card.js';

describe('small stat card ui helpers', () => {
  test('라벨과 값은 표시 가능한 문자열로 보정한다', () => {
    expect(normalizeSmallStatLabel('전체 식자재')).toBe('전체 식자재');
    expect(normalizeSmallStatLabel(2026)).toBe('2026');
    expect(normalizeSmallStatLabel({ label: 'bad' })).toBe('');
    expect(normalizeSmallStatValue(12)).toBe('12');
    expect(normalizeSmallStatValue(null)).toBe('—');
  });

  test('단위는 표시 가능한 문자열로 보정한다', () => {
    expect(normalizeSmallStatUnit('개')).toBe('개');
    expect(normalizeSmallStatUnit('')).toBe('');
    expect(normalizeSmallStatUnit({ unit: 'bad' })).toBe('');
  });

  test('값 색상은 문자열만 style로 허용한다', () => {
    expect(normalizeSmallStatValueColor('var(--positive)')).toBe('var(--positive)');
    expect(normalizeSmallStatValueColor('')).toBeUndefined();
    expect(normalizeSmallStatValueColor({ color: 'bad' })).toBeUndefined();
  });

  test('카드/라벨/값/단위 스타일은 기존 표시값을 유지한다', () => {
    expect(getSmallStatCardStyle()).toEqual({ padding: '12px 20px', flex: 1 });
    expect(getSmallStatLabelStyle()).toEqual({ fontSize: 12, color: 'var(--text-3)' });
    expect(getSmallStatValueStyle('var(--negative)')).toMatchObject({
      fontSize: 22,
      fontWeight: 700,
      marginTop: 2,
      color: 'var(--negative)',
    });
    expect(getSmallStatValueStyle({ color: 'bad' })).toMatchObject({
      color: undefined,
    });
    expect(getSmallStatUnitStyle()).toEqual({
      fontSize: 13,
      color: 'var(--text-3)',
      marginLeft: 4,
    });
  });
});
