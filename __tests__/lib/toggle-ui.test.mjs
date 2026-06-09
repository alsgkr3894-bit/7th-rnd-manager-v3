import { describe, expect, test } from '@jest/globals';
import {
  getNextToggleValue,
  getToggleButtonStyle,
  getToggleKnobStyle,
  normalizeToggleChecked,
  normalizeToggleDisabled,
  normalizeToggleOnChange,
} from '../../lib/ui/toggle.js';

describe('toggle ui helpers', () => {
  test('checked와 disabled 값은 boolean으로 보정한다', () => {
    expect(normalizeToggleChecked(1)).toBe(true);
    expect(normalizeToggleChecked('')).toBe(false);
    expect(normalizeToggleDisabled('disabled')).toBe(true);
    expect(normalizeToggleDisabled(0)).toBe(false);
  });

  test('다음 토글 값은 현재 checked 상태의 반대값이다', () => {
    expect(getNextToggleValue(true)).toBe(false);
    expect(getNextToggleValue(false)).toBe(true);
    expect(getNextToggleValue('on')).toBe(false);
  });

  test('onChange는 함수만 그대로 사용한다', () => {
    const handler = () => 'ok';
    expect(normalizeToggleOnChange(handler)).toBe(handler);
    expect(() => normalizeToggleOnChange(null)(true)).not.toThrow();
  });

  test('버튼 스타일은 활성/비활성 상태를 기존 값으로 계산한다', () => {
    expect(getToggleButtonStyle({ checked: true, disabled: false })).toMatchObject({
      width: 44,
      height: 24,
      cursor: 'pointer',
      background: 'var(--accent)',
      opacity: 1,
    });
    expect(getToggleButtonStyle({ checked: false, disabled: true })).toMatchObject({
      cursor: 'not-allowed',
      background: 'var(--border-strong)',
      opacity: 0.5,
    });
  });

  test('knob 위치는 checked 상태에 따라 기존 위치를 유지한다', () => {
    expect(getToggleKnobStyle(true)).toMatchObject({ left: 22, width: 18, height: 18 });
    expect(getToggleKnobStyle(false)).toMatchObject({ left: 3, width: 18, height: 18 });
  });
});
