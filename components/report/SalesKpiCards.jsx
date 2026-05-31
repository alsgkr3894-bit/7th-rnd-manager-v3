'use client';
import { fmtKRW } from '@/lib/format';

/**
 * SalesKpiCards
 * Renders the four KPI metric cards shown at the top of the sales report preview.
 *
 * Props
 * ─────
 * kpi         — { current, previous, deltaPct } | null
 * catShares   — array used to derive category count
 * groupRanking — array used to derive total menu count
 */
export default function SalesKpiCards({ kpi, catShares, groupRanking }) {
  return (
    <div className="paper-stat-row">
      <div className="paper-stat">
        <div className="paper-stat-label">총 판매량</div>
        <div className="paper-stat-val num">
          {kpi ? fmtKRW(kpi.current) : '—'}<span className="unit">건</span>
        </div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">전월 대비</div>
        <div
          className="paper-stat-val num"
          style={{color: kpi?.deltaPct >= 0 ? 'var(--positive)' : 'var(--negative)'}}
        >
          {kpi?.deltaPct != null
            ? `${kpi.deltaPct >= 0 ? '+' : ''}${kpi.deltaPct.toFixed(1)}%`
            : '—'}
        </div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">카테고리 수</div>
        <div className="paper-stat-val num">{catShares.length || '—'}</div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">총 메뉴 수</div>
        <div className="paper-stat-val num">{groupRanking.length || '—'}</div>
      </div>
    </div>
  );
}
