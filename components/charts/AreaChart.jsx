'use client';
import { useState, useRef, useMemo } from 'react';
import { fmtShort } from '@/lib/format';

/* ── 유틸 ─────────────────────────────────────────────────────── */

/** Catmull-Rom → cubic bezier smooth path (SVG 0-100 좌표계) */
function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const t = 0.18; // tension
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)},${cp2x.toFixed(2)} ${cp2y.toFixed(2)},${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/** 값 x 이상이 되는 "보기 좋은" 스텝(1·2·5·10 × 10ⁿ) */
function niceStep(x) {
  if (x <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / mag;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return m * mag;
}

/**
 * "보기 좋은" Y 눈금 계산.
 * 최상단 눈금(step*count)이 dataMax 이상이 되도록 보장한다 —
 * 그렇지 않으면 데이터가 차트 상단에 평평하게 붙어버린다.
 */
function calcTicks(dataMax, count = 4) {
  if (dataMax <= 0) return Array.from({ length: count + 1 }, (_, i) => i * 250);
  let step = niceStep(dataMax / count);
  while (step * count < dataMax) step = niceStep(step * 1.5);
  return Array.from({ length: count + 1 }, (_, i) => step * i);
}

/* ── 컴포넌트 ──────────────────────────────────────────────────── */

export function AreaChart({
  series,
  labels,
  height  = 200,
  colors  = ['#1D766F', '#7C3AED'],
  formatY,
}) {
  const fmt  = formatY || fmtShort;
  const [hover, setHover] = useState(null);
  const svgWrapRef = useRef(null);
  // 안정적 gradient ID — 마운트 시 1회 생성
  const uid = useRef(`ac-${Math.random().toString(36).slice(2, 8)}`).current;

  const Y_W   = 46;   // Y축 라벨 영역 너비 (px)
  const X_H   = 24;   // X축 라벨 영역 높이 (px)
  const CHART_H = height;
  // 포인트 개수는 labels 우선, 없으면 series 데이터 길이로 도출.
  // (labels=[] 인데 series에 데이터가 있으면 선이 안 그려지는 문제 방지)
  const n     = (labels?.length) || Math.max(0, ...(series || []).map(s => s.data?.length || 0));

  const allVals = series.flatMap(s => s.data).filter(v => Number.isFinite(v));
  const dataMax = Math.max(...allVals, 1);

  const TICK_COUNT = 4;
  const ticks   = useMemo(() => calcTicks(dataMax, TICK_COUNT), [dataMax]);
  const niceMax = ticks[ticks.length - 1] * 1.04; // 살짝 여유

  /* SVG는 0-100 좌표계 (preserveAspectRatio="none") */
  const xPct = i => n <= 1 ? 50 : (i / (n - 1)) * 100;
  const yPct = v  => 100 - Math.min(Math.max((v / niceMax) * 100, 0), 100);

  /* 시리즈 경로 메모이제이션 — n=0(labels=[]) 시 빈 경로 반환 */
  const paths = useMemo(() => {
    if (n === 0) return series.map(() => ({ pts: [], line: '', area: '' }));
    return series.map(s => {
      const pts  = s.data.map((v, i) => [xPct(i), yPct(v)]);
      const line = smoothPath(pts);
      const area = pts.length > 0
        ? line + ` L ${xPct(pts.length - 1).toFixed(2)} 100 L ${xPct(0).toFixed(2)} 100 Z`
        : '';
      return { pts, line, area };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, n, niceMax]);

  function handleMouseMove(e) {
    if (!svgWrapRef.current || n === 0) return;
    const rect = svgWrapRef.current.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xPct(i) / 100 - pct);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'flex' }}>

        {/* ── Y축 라벨 ── */}
        <div style={{ width: Y_W, flexShrink: 0, height: CHART_H, position: 'relative' }}>
          {ticks.map((v, i) => (
            <div key={i} style={{
              position: 'absolute', right: 8,
              top: `${yPct(v)}%`, transform: 'translateY(-50%)',
              fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            }}>
              {fmt(v)}
            </div>
          ))}
        </div>

        {/* ── SVG 차트 영역 ── */}
        <div
          ref={svgWrapRef}
          style={{ flex: 1, height: CHART_H, position: 'relative', cursor: n > 0 ? 'crosshair' : 'default' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
          >
            <defs>
              {series.map((_, si) => (
                <linearGradient key={si} id={`${uid}-g${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={colors[si] ?? '#888'} stopOpacity={si === 0 ? 0.22 : 0.11} />
                  <stop offset="100%" stopColor={colors[si] ?? '#888'} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {/* 수평 그리드 */}
            {ticks.map((v, i) => (
              <line key={i}
                x1={0} y1={yPct(v)} x2={100} y2={yPct(v)}
                stroke="var(--divider)"
                strokeWidth={i === 0 ? 0.45 : 0.28}
                strokeOpacity={0.85}
              />
            ))}

            {/* 영역 채우기 (선 아래) */}
            {paths.map(({ area }, si) => (
              <path key={`a${si}`} d={area} fill={`url(#${uid}-g${si})`} />
            ))}

            {/* 선 + 점 */}
            {paths.map(({ line, pts }, si) => (
              <g key={`l${si}`}>
                <path
                  d={line} fill="none"
                  stroke={colors[si] ?? '#888'}
                  strokeWidth="0.8"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {pts.map(([x, y], i) => {
                  const active = hover === i;
                  const last   = i === pts.length - 1 && si === 0;
                  if (!active && !last) return null;
                  return (
                    <circle key={i} cx={x} cy={y}
                      r={active ? 2.4 : 1.6}
                      fill={colors[si] ?? '#888'}
                      stroke="var(--surface)" strokeWidth="0.55"
                    />
                  );
                })}
              </g>
            ))}

            {/* 호버 세로선 */}
            {hover != null && (
              <line
                x1={xPct(hover)} y1={0} x2={xPct(hover)} y2={100}
                stroke="var(--text-3)" strokeWidth="0.35" strokeDasharray="2 1.8"
              />
            )}
          </svg>

          {/* ── 툴팁 ── */}
          {hover != null && n > 0 && (() => {
            const xp      = xPct(hover);
            const toRight = xp < 58;
            return (
              <div style={{
                position: 'absolute', top: 6, zIndex: 20,
                ...(toRight
                  ? { left:  `calc(${xp}% + 11px)` }
                  : { right: `calc(${100 - xp}% + 11px)` }),
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '9px 13px',
                boxShadow: '0 6px 22px rgba(0,0,0,.1)',
                pointerEvents: 'none',
                minWidth: 148,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                  marginBottom: 7, letterSpacing: '0.02em',
                }}>
                  {labels[hover]}
                </div>
                {series.map((s, si) => (
                  <div key={si} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 12, marginTop: si > 0 ? 5 : 0,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: colors[si], flexShrink: 0,
                    }} />
                    <span style={{ color: 'var(--text-3)', fontWeight: 600, flex: 1 }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontWeight: 800, color: 'var(--text-1)',
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                    }}>
                      {fmt(s.data[hover])}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── X축 라벨 (HTML — SVG 왜곡 없음) ── */}
      {n > 0 && (
        <div style={{ position: 'relative', marginLeft: Y_W, height: X_H, marginTop: 5 }}>
          {labels.map((l, i) => {
            const isFirst = i === 0;
            const isLast  = i === n - 1;
            const xp      = xPct(i);
            return (
              <div key={i} style={{
                position: 'absolute',
                ...(isFirst
                  ? { left: 0 }
                  : isLast
                  ? { right: 0 }
                  : { left: `${xp}%`, transform: 'translateX(-50%)' }),
                fontSize: 11,
                fontWeight: hover === i ? 800 : 600,
                color: hover === i ? 'var(--text-1)' : 'var(--text-4)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
                lineHeight: 1,
                paddingTop: 4,
              }}>
                {l}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
