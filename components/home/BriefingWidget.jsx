'use client';
import { formatNumber } from '@/lib/format';
import { Sparkline } from '@/components/charts/Sparkline';

/**
 * 이번 달 브리핑 히어로 — 한 문장 요약 + 통계 칩 4개 + 스파크라인.
 *
 * @param {{ data: import('@/lib/stats/briefing-stats').MonthlyBriefing | null }} props
 */
export function BriefingWidget({ data }) {
  if (!data) return null;
  const toneColor = {
    up: 'var(--positive)',
    down: 'var(--negative)',
    accent: 'var(--accent)',
    muted: 'var(--text-3)',
  };

  return (
    <section className="briefing">
      <div>
        <span className="brief-tag"><span className="pulse" />이번 달 브리핑 · {data.rangeLabel}</span>
        <p className="brief-head">
          {data.sentence.map((part, i) => (
            <span key={i} style={part.tone ? { color: toneColor[part.tone] } : undefined}>{part.text}</span>
          ))}
        </p>
        <div className="brief-stats">
          {data.chips.map((c, i) => (
            <div key={i} className="brief-stat">
              <div className="l">{c.label}</div>
              <div className="v" style={c.tone === 'down' ? { color: 'var(--negative)' } : undefined}>
                {formatNumber(c.value)}<span className="unit">{c.unit}</span>
              </div>
              <div className="d" style={{ color: toneColor[c.tone] || 'var(--text-3)' }}>{c.deltaText}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="brief-aside">
        <div className="brief-spark">
          <Sparkline data={data.spark} color="var(--accent)" height={76} />
        </div>
        <span className="brief-spark-cap">최근 7개월 판매량</span>
      </div>
    </section>
  );
}
