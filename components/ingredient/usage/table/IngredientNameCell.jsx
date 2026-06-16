export function IngredientNameCell({ row, scopeStyle }) {
  return (
    <>
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {row.name}
        {row.scope && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 8,
              color: scopeStyle?.color || 'var(--text-3)',
              background: scopeStyle?.bg || 'var(--surface-2)',
              whiteSpace: 'nowrap',
            }}
          >
            {row.scope}
          </span>
        )}
      </div>
      {row.code && (
        <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace' }}>
          {row.code}
        </div>
      )}
    </>
  );
}
