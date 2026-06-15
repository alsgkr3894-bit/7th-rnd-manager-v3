'use client';

export function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <div id={id} role="alert" style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}>
      {children}
    </div>
  );
}
