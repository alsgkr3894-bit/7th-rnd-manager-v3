const noop = () => {};

export function normalizeToggleChecked(value) {
  return Boolean(value);
}

export function normalizeToggleDisabled(value) {
  return Boolean(value);
}

export function normalizeToggleOnChange(onChange) {
  return typeof onChange === 'function' ? onChange : noop;
}

export function getNextToggleValue(value) {
  return !normalizeToggleChecked(value);
}

export function getToggleButtonStyle({ checked, disabled } = {}) {
  const isChecked = normalizeToggleChecked(checked);
  const isDisabled = normalizeToggleDisabled(disabled);

  return {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    background: isChecked ? 'var(--accent)' : 'var(--border-strong)',
    transition: 'background 200ms',
    position: 'relative',
    flex: '0 0 auto',
    opacity: isDisabled ? 0.5 : 1,
  };
}

export function getToggleKnobStyle(checked) {
  return {
    position: 'absolute',
    top: 3,
    left: normalizeToggleChecked(checked) ? 22 : 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'white',
    transition: 'left 200ms',
  };
}
