'use client';
import {
  getNextToggleValue,
  getToggleButtonStyle,
  getToggleKnobStyle,
  normalizeToggleChecked,
  normalizeToggleDisabled,
  normalizeToggleOnChange,
} from '@/lib/ui/toggle';

/**
 * Toggle — 공통 스위치 컴포넌트.
 *
 * @param {boolean}  value
 * @param {Function} onChange(newValue)
 * @param {boolean}  [disabled=false]
 */
export function Toggle({ value, onChange, disabled = false, label = '설정 토글' }) {
  const checked = normalizeToggleChecked(value);
  const isDisabled = normalizeToggleDisabled(disabled);
  const notifyChange = normalizeToggleOnChange(onChange);

  return (
    <button
      type="button"
      onClick={() => !isDisabled && notifyChange(getNextToggleValue(checked))}
      aria-label={label}
      aria-pressed={checked}
      disabled={isDisabled}
      style={getToggleButtonStyle({ checked, disabled: isDisabled })}
    >
      <span style={getToggleKnobStyle(checked)} />
    </button>
  );
}
