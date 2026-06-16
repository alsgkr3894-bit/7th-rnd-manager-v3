export function AreaXAxisLabels({ labels, pointCount, hover, xPct, yWidth, height }) {
  if (pointCount <= 0) return null;

  return (
    <div style={{ position: 'relative', marginLeft: yWidth, height, marginTop: 5 }}>
      {labels.map((label, index) => {
        const isFirst = index === 0;
        const isLast = index === pointCount - 1;
        const xp = xPct(index);
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              ...(isFirst
                ? { left: 0 }
                : isLast
                  ? { right: 0 }
                  : { left: `${xp}%`, transform: 'translateX(-50%)' }),
              fontSize: 11,
              fontWeight: hover === index ? 800 : 600,
              color: hover === index ? 'var(--text-1)' : 'var(--text-4)',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              paddingTop: 4,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
