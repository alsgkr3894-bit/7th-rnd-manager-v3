export function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
        paddingBottom: 4,
        borderBottom: '1px solid var(--divider)',
      }}
    >
      {children}
    </div>
  );
}

export function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>
      {children}
    </div>
  );
}

export const thStyle = {
  padding: '5px 8px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 11,
  color: 'var(--text-3)',
  whiteSpace: 'nowrap',
};
