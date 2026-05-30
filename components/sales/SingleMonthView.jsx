'use client';
import { formatNumber } from '@/lib/format';
import { costRateColor } from '@/lib/cost/rate-color';
import { MonthRankTable } from './MonthRankTable';
import { CategoryDetailGrid } from './CategoryDetailGrid';

/**
 * SingleMonthView — 월 상세 보기 (PeriodBar 'single' 모드)
 *
 * 구성:
 *   1. 상단 KPI 2 카드 (전체 판매량 + 평균 원가율)
 *   2. 메뉴 순위 테이블 (검색 + 카테고리 필터 + 판매 비중)
 *   3. 카테고리별 판매 비중 그리드 (각 카드에 TOP 3)
 */
export function SingleMonthView({
  period,
  detail,
  menus,
  categories,
  category,
  onCategoryChange,
  avgCostRate,   // 피자 평균 원가율 (%)
}) {
  const hasRate = avgCostRate != null && avgCostRate > 0;

  return (
    <>
      <div className="hero-row" style={{marginTop:16}}>
        <div className="card kpi-card">
          <div>
            <div className="label">전체 판매량</div>
            <div className="value num">{formatNumber(detail?.total ?? 0)}<span className="unit">개</span></div>
            <div className="trend">
              <span style={{color:'var(--text-3)'}}>
                {period ? `${period.year}년 ${period.month}월 기준` : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="card kpi-card">
          <div>
            <div className="label">
              평균 원가율
              <span className="pill">피자 카테고리</span>
            </div>
            <div className="value num" style={{color: costRateColor(avgCostRate)}}>
              {hasRate ? avgCostRate.toFixed(1) : '—'}
              <span className="unit">%</span>
            </div>
            <div className="trend">
              {hasRate ? (
                <span style={{color: costRateColor(avgCostRate)}}>
                  {avgCostRate <= 30 ? '양호' : avgCostRate <= 40 ? '보통' : '주의'}
                </span>
              ) : (
                <span style={{color:'var(--text-4)'}}>
                  원가 레시피를 먼저 등록하세요
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <CategoryDetailGrid
        detail={detail}
        onCategoryClick={(c) => onCategoryChange(c === category ? null : c)}
      />

      <MonthRankTable
        menus={menus}
        categories={categories}
        category={category}
        onCategoryChange={onCategoryChange}
        total={detail?.total ?? 0}
      />
    </>
  );
}
