export function AreaTooltip({ hover, pointCount, xPct, labels, series, colors, formatValue }) {
  if (hover == null || pointCount <= 0) return null;

  const xp = xPct(hover);
  const toRight = xp < 58;

  return (
    <div
      style={{
        position: 'absolute',
        top: 6,
        zIndex: 20,
        ...(toRight
          ? { left: `calc(${xp}% + 11px)` }
          : { right: `calc(${100 - xp}% + 11px)` }),
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '9px 13px',
        boxShadow: '0 6px 22px rgba(0,0,0,.1)',
        pointerEvents: 'none',
        minWidth: 148,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-3)',
          marginBottom: 7,
          letterSpacing: '0.02em',
        }}
      >
        {labels[hover]}
      </div>
      {series.map((item, seriesIndex) => (
        <div
          key={seriesIndex}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            marginTop: seriesIndex > 0 ? 5 : 0,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colors[seriesIndex] ?? '#888',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-3)', fontWeight: 600, flex: 1 }}>{item.name}</span>
          <span
            style={{
              fontWeight: 800,
              color: 'var(--text-1)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {formatValue(item.data[hover] ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
