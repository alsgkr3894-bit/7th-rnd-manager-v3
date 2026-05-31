'use client';
import { MC } from '@/components/cost/margin/MarginRow';

/**
 * MarginSummaryCards
 *
 * Props:
 *   stats     – { avg, lowCostCount, highCostCount } | null
 *   viewMode  – 'cost' | 'margin'
 *   hasAdjustment – bool (shows ⟳ indicator when platform/discount active)
 */
export function MarginSummaryCards({ stats, viewMode, hasAdjustment }) {
  if (!stats) return null;

  return (
    <div className="stat-row" style={{ marginTop:8 }}>
      <div className="stat-card">
        <div className="stat-label">
          평균 {viewMode === 'margin' ? '마진율' : '원가율'}{hasAdjustment ? ' ⟳' : ''}
        </div>
        <div className="stat-value" style={{ color: MC(viewMode === 'margin' ? 100 - stats.avg : stats.avg, viewMode) }}>
          {viewMode === 'margin' ? (100 - stats.avg).toFixed(1) : stats.avg.toFixed(1)}<span className="unit">%</span>
        </div>
      </div>
      {viewMode === 'cost' ? (
        <>
          <div className="stat-card">
            <div className="stat-label">원가율 30% 이하</div>
            <div className="stat-value" style={{ color:'var(--positive, #10b981)' }}>
              {stats.lowCostCount}<span className="unit">개</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">원가율 40% 초과</div>
            <div className="stat-value" style={{ color:stats.highCostCount > 0 ? 'var(--negative, #ef4444)' : undefined }}>
              {stats.highCostCount}<span className="unit">개</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stat-card">
            <div className="stat-label">마진율 70% 이상</div>
            <div className="stat-value" style={{ color:'var(--positive, #10b981)' }}>
              {stats.lowCostCount}<span className="unit">개</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">마진율 60% 미만</div>
            <div className="stat-value" style={{ color:stats.highCostCount > 0 ? 'var(--negative, #ef4444)' : undefined }}>
              {stats.highCostCount}<span className="unit">개</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
