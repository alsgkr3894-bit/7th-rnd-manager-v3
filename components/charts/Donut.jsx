'use client';
import { useState, useEffect } from 'react';

export function Donut({ items, size = 140, thickness = 14, onSegmentHover }) {
  const [ready, setReady] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    const r1 = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(r1);
  }, []);

  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  const total = items.reduce((s, x) => s + x.value, 0);
  let acc = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
      {items.map((it, i) => {
        const frac = total > 0 ? it.value / total : 0;
        const dash = c * frac;
        const offset = -c * acc;
        acc += frac;
        const isHovered = hoveredIdx === i;
        const sw = isHovered ? thickness + 5 : (hoveredIdx !== null ? thickness - 2 : thickness);
        return (
          <circle key={i} className="donut-seg"
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={it.color} strokeWidth={sw} strokeLinecap="butt"
            strokeDasharray={ready ? `${dash} ${c - dash}` : `0 ${c}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{
              transition: `stroke-dasharray 560ms cubic-bezier(0.16,1,0.3,1) ${80 + i * 45}ms, stroke-width 200ms ease, opacity 200ms ease`,
              opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
            }}
            onMouseEnter={() => { setHoveredIdx(i); onSegmentHover?.(i); }}
            onMouseLeave={() => { setHoveredIdx(null); onSegmentHover?.(null); }}
          />
        );
      })}
    </svg>
  );
}
