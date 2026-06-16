export function AreaYAxisLabels({ ticks, yPct, formatValue, width, height }) {
  return (
    <div style={{ width, flexShrink: 0, height, position: 'relative' }}>
      {ticks.map((value, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            right: 8,
            top: `${yPct(value)}%`,
            transform: 'translateY(-50%)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-4)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {formatValue(value)}
        </div>
      ))}
    </div>
  );
}
