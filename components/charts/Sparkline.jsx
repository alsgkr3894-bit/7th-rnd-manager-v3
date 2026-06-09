'use client';
import { useEffect, useId, useRef } from 'react';
import { normalizeChartColor, normalizeChartDimension, normalizeNumberSeries } from '@/lib/ui/chart-data';

export function Sparkline({ data, color = 'var(--accent)', fill = true, height = 56, width = 320 }) {
  const lineRef = useRef(null);
  const w = normalizeChartDimension(width, 320, { min: 16, max: 2000 });
  const h = normalizeChartDimension(height, 56, { min: 12, max: 600 });
  const safeColor = normalizeChartColor(color, 'var(--accent)');
  const pad = 4;
  // SSR/CSR hydration mismatch 회피: Math.random() 대신 React 18 useId() 사용
  const reactId = useId();
  const gid = `sp-${reactId.replace(/:/g, '')}`;

  // 빈 데이터 / 단일 포인트 가드
  const safeData = normalizeNumberSeries(data);
  const allZero = safeData.length > 0 && safeData.every(v => !v);
  const hasData = safeData.length >= 2 && !allZero;

  const min = hasData ? Math.min(...safeData) : 0;
  const max = hasData ? Math.max(...safeData) : 1;
  const span = max - min || 1;
  const step = hasData ? (w - pad * 2) / (safeData.length - 1) : 0;
  const pts = hasData
    ? safeData.map((v, i) => [pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)])
    : [];
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const dArea = hasData ? d + ` L ${(w - pad).toFixed(1)} ${(h - pad).toFixed(1)} L ${pad} ${(h - pad).toFixed(1)} Z` : '';

  // hook은 분기 전에 무조건 호출 (Rules of Hooks)
  useEffect(() => {
    const el = lineRef.current;
    if (!el || !hasData) return;
    let raf1 = null;
    let raf2 = null;
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.style.transition = 'none';
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.strokeDashoffset = '0';
    }); });
    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [data, hasData]);

  // 모든 값이 0이면 회색 점선 placeholder 표시
  if (allZero) {
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line
          x1={pad} y1={h / 2} x2={w - pad} y2={h / 2}
          stroke="var(--border)" strokeWidth="1.5"
          strokeDasharray="4 4" strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={safeColor} stopOpacity="0.22"/>
              <stop offset="100%" stopColor={safeColor} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={dArea} fill={`url(#${gid})`} style={{opacity:0, animation:'fade-in 600ms 400ms ease both'}} />
        </>
      )}
      <path ref={lineRef} d={d} fill="none" stroke={safeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {hasData && (
        <>
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={safeColor}
            style={{opacity:0, animation:'fade-in 200ms 920ms ease both'}} />
          <circle className="spark-pulse-ring" cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={safeColor} opacity="0" />
        </>
      )}
    </svg>
  );
}
