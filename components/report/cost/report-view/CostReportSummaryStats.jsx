import { formatNumber } from '@/lib/format';

export function CostReportSummaryStats({
  totalCount,
  activeCategoryCount,
  allAvg,
  allRisk,
  allMaxRate,
  riskThreshold,
}) {
  return (
    <div className="paper-stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <div className="paper-stat">
        <div className="paper-stat-label">대상 메뉴</div>
        <div className="paper-stat-val num">
          {totalCount > 0 ? formatNumber(totalCount) : '—'}
          <span className="unit">{totalCount > 0 ? '개' : ''}</span>
        </div>
        <div className="paper-stat-foot">{activeCategoryCount}개 카테고리</div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">평균 원가율</div>
        <div className="paper-stat-val num">
          {allAvg > 0 ? allAvg.toFixed(1) : '—'}
          <span className="unit">{allAvg > 0 ? '%' : ''}</span>
        </div>
        <div className="paper-stat-foot">전 카테고리 가중평균</div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">위험 메뉴</div>
        <div className="paper-stat-val num" style={{ color: 'var(--warn)' }}>
          {formatNumber(allRisk)}
        </div>
        <div className="paper-stat-foot">{riskThreshold}% 초과</div>
      </div>
      <div className="paper-stat">
        <div className="paper-stat-label">최고 원가율</div>
        <div className="paper-stat-val num" style={{ color: 'var(--negative)' }}>
          {allMaxRate > 0 ? allMaxRate.toFixed(1) : '—'}
          <span className="unit">{allMaxRate > 0 ? '%' : ''}</span>
        </div>
        <div className="paper-stat-foot">단일 메뉴 기준</div>
      </div>
    </div>
  );
}
