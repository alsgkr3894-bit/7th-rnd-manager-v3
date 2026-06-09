'use client';
import { formatNumber } from '@/lib/format';
import { asObjectArray } from '@/lib/ui/prop-guards';

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
  const safeCatShares = asObjectArray(catShares);
  const safeGroupRanking = asObjectArray(groupRanking);
  const current = Number.isFinite(Number(kpi?.current)) ? Number(kpi.current) : null;
  const deltaPct = kpi?.deltaPct == null
    ? null
    : Number.isFinite(Number(kpi.deltaPct))
      ? Number(kpi.deltaPct)
      : null;

  return (
    <div className="paper-stat-row">
      <div className="paper-stat">
        <div className="paper-stat-label">총 판매량</div>
        <div className="paper-stat-val num">
          {current != null ? formatNumber(current) : '—'}<span className="unit">건</span>
        </div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">전월 대비</div>
        <div
          className="paper-stat-val num"
          style={{color: deltaPct == null || deltaPct >= 0 ? 'var(--positive)' : 'var(--negative)'}}
        >
          {deltaPct != null
            ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`
            : '—'}
        </div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">카테고리 수</div>
        <div className="paper-stat-val num">{safeCatShares.length || '—'}</div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">총 메뉴 수</div>
        <div className="paper-stat-val num">{safeGroupRanking.length || '—'}</div>
      </div>
    </div>
  );
}
