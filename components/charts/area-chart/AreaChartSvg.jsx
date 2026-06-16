export function AreaChartSvg({ paths, ticks, yPct, xPct, hover, uid, series, colors }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
    >
      <defs>
        {series.map((_, seriesIndex) => (
          <linearGradient
            key={seriesIndex}
            id={`${uid}-g${seriesIndex}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={colors[seriesIndex] ?? '#888'}
              stopOpacity={seriesIndex === 0 ? 0.22 : 0.11}
            />
            <stop offset="100%" stopColor={colors[seriesIndex] ?? '#888'} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {ticks.map((value, index) => (
        <line
          key={index}
          x1={0}
          y1={yPct(value)}
          x2={100}
          y2={yPct(value)}
          stroke="var(--divider)"
          strokeWidth={index === 0 ? 0.45 : 0.28}
          strokeOpacity={0.85}
        />
      ))}

      {paths.map(({ area }, seriesIndex) => (
        <path key={`a${seriesIndex}`} d={area} fill={`url(#${uid}-g${seriesIndex})`} />
      ))}

      {paths.map(({ line, pts }, seriesIndex) => (
        <g key={`l${seriesIndex}`}>
          <path
            d={line}
            fill="none"
            stroke={colors[seriesIndex] ?? '#888'}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map(([x, y], index) => {
            const active = hover === index;
            const last = index === pts.length - 1 && seriesIndex === 0;
            if (!active && !last) return null;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={active ? 2.4 : 1.6}
                fill={colors[seriesIndex] ?? '#888'}
                stroke="var(--surface)"
                strokeWidth="0.55"
              />
            );
          })}
        </g>
      ))}

      {hover != null && (
        <line
          x1={xPct(hover)}
          y1={0}
          x2={xPct(hover)}
          y2={100}
          stroke="var(--text-3)"
          strokeWidth="0.35"
          strokeDasharray="2 1.8"
        />
      )}
    </svg>
  );
}
