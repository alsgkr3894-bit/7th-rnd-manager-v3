export function SegGroup({ options, value, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          aria-pressed={value === o}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            border: '1px solid',
            borderColor: value === o ? 'var(--accent)' : 'var(--border)',
            background: value === o ? 'var(--accent)' : 'var(--surface-2)',
            color: value === o ? '#fff' : 'var(--text-2)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: value === o ? 700 : 400,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.65 : 1,
          }}
          onMouseDown={event => {
            event.stopPropagation();
          }}
          onClick={event => {
            event.stopPropagation();
            if (!disabled && value !== o) onChange(o);
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, required, hint, error, children }) {
  // Segmented buttons live inside Field too, so keep this as a neutral container.
  return (
    <div style={{ display: 'block', marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: error ? 'var(--negative)' : 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--negative)', marginLeft: 2 }}>*</span>}
        {hint && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)', marginLeft: 6 }}>
            {hint}
          </span>
        )}
        {error && (
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>필수 항목입니다</span>
        )}
      </div>
      {error ? (
        <div style={{ outline: '1.5px solid var(--negative)', borderRadius: 8 }}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
