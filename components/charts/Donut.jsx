'use client';
import { useState, useEffect } from 'react';
import { normalizeChartColor, normalizeChartDimension, normalizeDonutItems } from '@/lib/ui/chart-data';

export function Donut({ items, size = 140, thickness = 14, onSegmentHover }) {
  const [ready, setReady] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const safeItems = normalizeDonutItems(items);
  const safeSize = normalizeChartDimension(size, 140, { min: 40, max: 800 });
  const safeThickness = normalizeChartDimension(thickness, 14, { min: 1, max: Math.max(1, safeSize / 2 - 1) });
  const notifySegmentHover = typeof onSegmentHover === 'function' ? onSegmentHover : () => {};

  useEffect(() => {
    let r2 = null;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setReady(true)); });
    return () => {
      cancelAnimationFrame(r1);
      if (r2) cancelAnimationFrame(r2);
    };
  }, []);

  const r = (safeSize - safeThickness) / 2, c = 2 * Math.PI * r;
  const total = safeItems.reduce((s, x) => s + x.value, 0);
  let acc = 0;

  return (
    <svg viewBox={`0 0 ${safeSize} ${safeSize}`} width={safeSize} height={safeSize}>
      <circle cx={safeSize/2} cy={safeSize/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={safeThickness} />
      {safeItems.map((it, i) => {
        const frac = total > 0 ? it.value / total : 0;
        const dash = c * frac;
        const offset = -c * acc;
        acc += frac;
        const isHovered = hoveredIdx === i;
        const sw = isHovered ? safeThickness + 5 : (hoveredIdx !== null ? Math.max(1, safeThickness - 2) : safeThickness);
        const color = normalizeChartColor(it.color);
        return (
          <circle key={i} className="donut-seg"
            cx={safeSize/2} cy={safeSize/2} r={r} fill="none"
            stroke={color} strokeWidth={sw} strokeLinecap="butt"
            strokeDasharray={ready ? `${dash} ${c - dash}` : `0 ${c}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${safeSize/2} ${safeSize/2})`}
            style={{
              transition: `stroke-dasharray 560ms cubic-bezier(0.16,1,0.3,1) ${80 + i * 45}ms, stroke-width 200ms ease, opacity 200ms ease`,
              opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
            }}
            onMouseEnter={() => { setHoveredIdx(i); notifySegmentHover(i); }}
            onMouseLeave={() => { setHoveredIdx(null); notifySegmentHover(null); }}
          />
        );
      })}
    </svg>
  );
}
