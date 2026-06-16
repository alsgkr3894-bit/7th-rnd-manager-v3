export function MenuTypeCounts({ row }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'stretch',
        minWidth: 76,
        fontSize: 11,
        color: 'var(--text-3)',
      }}
    >
      <span>
        피자 <b style={{ color: 'var(--text-1)' }}>{row.pizzaCount || 0}</b>
      </span>
      <span>
        사이드 <b style={{ color: 'var(--text-1)' }}>{row.sideCount || 0}</b>
      </span>
    </div>
  );
}
