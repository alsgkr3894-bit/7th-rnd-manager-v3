'use client';

/**
 * Toggle — 공통 스위치 컴포넌트.
 *
 * @param {boolean}  value
 * @param {Function} onChange(newValue)
 * @param {boolean}  [disabled=false]
 */
export function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      aria-pressed={value}
      disabled={disabled}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: value ? 'var(--accent)' : 'var(--border-strong)',
        transition: 'background 200ms',
        position: 'relative',
        flex: '0 0 auto',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 22 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 200ms',
        }}
      />
    </button>
  );
}
