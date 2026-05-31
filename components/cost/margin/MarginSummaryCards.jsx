'use client';
import { MC } from '@/components/cost/margin/MarginRow';

/**
 * 마진 페이지 상단 요약 카드 (평균 원가율/마진율, 임계값 기준 항목 수).
 *
 * @param {Object} props
 * @param {{
 *   avg: number,
 *   lowCostCount: number,    // 원가율 ≤ 30% (= 마진율 ≥ 70%). cost뷰: "원가율 30% 이하", margin뷰: "마진율 70% 이상"
 *   highCostCount: number,   // 원가율 > 40% (= 마진율 < 60%). cost뷰: "원가율 40% 초과", margin뷰: "마진율 60% 미만"
 *   goodMarginCount?: number, // margin뷰 전용 대안 필드 (있으면 lowCostCount 대신 사용)
 *   badMarginCount?: number,  // margin뷰 전용 대안 필드 (있으면 highCostCount 대신 사용)
 * }|null} props.stats - 집계 통계. stats.avg 는 항상 원가율(%) 기준; 마진율 표시 시 100 - avg 로 변환.
 * @param {'cost'|'margin'} props.viewMode - 원가율 / 마진율 보기 모드
 * @param {boolean} props.hasAdjustment - 플랫폼·할인 적용 중일 때 ⟳ 표시
 */
export function MarginSummaryCards({ stats, viewMode, hasAdjustment }) {
  if (!stats) return null;

  return (
    <div className="stat-row" style={{ marginTop:8 }}>
      <div className="stat-card">
        <div className="stat-label">
          평균 {viewMode === 'margin' ? '마진율' : '원가율'}{hasAdjustment ? ' ⟳' : ''}
        </div>
        <div key={stats.avg} className="stat-value count-landed" style={{ color: MC(viewMode === 'margin' ? 100 - stats.avg : stats.avg, viewMode) }}>
          {viewMode === 'margin' ? (100 - stats.avg).toFixed(1) : stats.avg.toFixed(1)}<span className="unit">%</span>
        </div>
      </div>
      {viewMode === 'cost' ? (
        <>
          <div className="stat-card">
            <div className="stat-label">원가율 30% 이하</div>
            <div key={stats.lowCostCount} className="stat-value count-landed" style={{ color:'var(--positive, #10b981)' }}>
              {stats.lowCostCount}<span className="unit">개</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">원가율 40% 초과</div>
            <div key={stats.highCostCount} className="stat-value count-landed" style={{ color:stats.highCostCount > 0 ? 'var(--negative, #ef4444)' : undefined }}>
              {stats.highCostCount}<span className="unit">개</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stat-card">
            <div className="stat-label">마진율 70% 이상</div>
            <div key={stats.goodMarginCount ?? stats.lowCostCount} className="stat-value count-landed" style={{ color:'var(--positive, #10b981)' }}>
              {stats.goodMarginCount ?? stats.lowCostCount}<span className="unit">개</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">마진율 60% 미만</div>
            <div key={stats.badMarginCount ?? stats.highCostCount} className="stat-value count-landed" style={{ color:(stats.badMarginCount ?? stats.highCostCount) > 0 ? 'var(--negative, #ef4444)' : undefined }}>
              {stats.badMarginCount ?? stats.highCostCount}<span className="unit">개</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
