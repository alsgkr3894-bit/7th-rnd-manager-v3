'use client';
import { useEffect, useId, useRef } from 'react';

export function Sparkline({ data, color = 'var(--accent)', fill = true, height = 56 }) {
  const lineRef = useRef(null);
  const w = 320, h = height, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const dArea = d + ` L ${(w - pad).toFixed(1)} ${(h - pad).toFixed(1)} L ${pad} ${(h - pad).toFixed(1)} Z`;
  // SSR/CSR hydration mismatch 회피: Math.random() 대신 React 18 useId() 사용
  const reactId = useId();
  const gid = `sp-${reactId.replace(/:/g, '')}`;

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.strokeDashoffset = '0';
    }));
  }, [data]);

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={dArea} fill={`url(#${gid})`} style={{opacity:0, animation:'fade-in 600ms 400ms ease both'}} />
        </>
      )}
      <path ref={lineRef} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color}
        style={{opacity:0, animation:'fade-in 200ms 920ms ease both'}} />
      <circle className="spark-pulse-ring" cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color} opacity="0" />
    </svg>
  );
}
