'use client';
import { useState, useRef } from 'react';
import { fmtKRW, fmtShort } from '@/lib/fmt';

export function AreaChart({ series, labels, height = 240, colors, formatY }) {
  const w = 760, h = height, padL = 36, padR = 12, padT = 16, padB = 28;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const allVals = series.flatMap(s => s.data);
  const max = Math.max(...allVals);
  const niceMax = Math.ceil(max / 1000) * 1000 * 1.1;
  const xs = labels.map((_, i) => padL + (labels.length === 1 ? innerW / 2 : i * innerW / (labels.length - 1)));
  const yFor = v => padT + innerH - (v / niceMax) * innerH;
  const ticks = 4;
  const tickVals = Array.from({length: ticks + 1}, (_, i) => Math.round(niceMax * i / ticks / 100) * 100);

  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const handleMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * w;
    let bestI = 0, bestD = Infinity;
    xs.forEach((x, i) => { const d = Math.abs(x - px); if (d < bestD) { bestD = d; bestI = i; } });
    setHover({ index: bestI });
  };

  return (
    <div className="chart-wrap">
      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {tickVals.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--divider)" />
              <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--text-4)" fontWeight="600">{fmtShort(v)}</text>
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text key={i} x={xs[i]} y={h - 8} fontSize="10" textAnchor="middle"
            fill={hover?.index === i ? 'var(--text-1)' : 'var(--text-4)'}
            fontWeight={hover?.index === i ? '800' : '600'}>{l}</text>
        ))}
        {series.map((s, si) => {
          const color = colors[si];
          const pts = s.data.map((v, i) => [xs[i], yFor(v)]);
          const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
          const dArea = d + ` L ${xs[xs.length-1].toFixed(1)} ${(padT+innerH).toFixed(1)} L ${xs[0].toFixed(1)} ${(padT+innerH).toFixed(1)} Z`;
          const gid = 'ar-' + si;
          return (
            <g key={si}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={si === 0 ? 0.18 : 0.08}/>
                  <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={dArea} fill={`url(#${gid})`} />
              <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => {
                const r = hover?.index === i ? 5 : (i === pts.length - 1 && si === 0 ? 4 : 0);
                return <circle key={i} cx={p[0]} cy={p[1]} r={r} fill={color} stroke="var(--surface)" strokeWidth="2" />;
              })}
            </g>
          );
        })}
        {hover && <line x1={xs[hover.index]} x2={xs[hover.index]} y1={padT} y2={padT+innerH} stroke="var(--text-4)" strokeDasharray="3 3" strokeWidth="1" />}
        {hover && <line className="chart-h-line" x1={padL} x2={xs[hover.index]} y1={yFor(series[0].data[hover.index])} y2={yFor(series[0].data[hover.index])} />}
      </svg>
      {hover && (() => {
        const i = hover.index;
        const v0 = series[0].data[i], v1 = series[1]?.data[i];
        const diff = v1 ? ((v0 - v1) / v1) * 100 : 0;
        return (
          <div className="chart-tip" style={{ left: `${(xs[i] / w) * 100}%`, top: 8 }}>
            <div className="tip-label">{labels[i]}</div>
            {series.map((s, si) => (
              <div className="tip-row" key={si}>
                <span className="dot" style={{background: colors[si]}}></span>
                <span className="tip-name">{s.name}</span>
                <span className="tip-val num">{(formatY || fmtKRW)(s.data[i])}</span>
              </div>
            ))}
            {v1 && (
              <div className="tip-diff" style={{color: diff >= 0 ? 'var(--positive)' : 'var(--negative)'}}>
                {diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
