export function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 60 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function FormField({ label, hint, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
        {label}
        {hint && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <div style={{ fontSize: 12, color: 'var(--negative)', marginTop: 6 }}>{children}</div>;
}
