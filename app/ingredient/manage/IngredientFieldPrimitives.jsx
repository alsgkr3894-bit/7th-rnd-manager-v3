'use client';

export function SourceField({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 64, fontWeight: 500 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: value ? 'var(--text-1)' : 'var(--text-4)',
          fontWeight: value ? 600 : 400,
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

export function Field({ label, required, hint, error, errorId, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--negative)', marginLeft: 2 }}>*</span>}
        {hint && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div
          id={errorId}
          role="alert"
          style={{ fontSize: 12, color: 'var(--negative)', marginTop: 4 }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
