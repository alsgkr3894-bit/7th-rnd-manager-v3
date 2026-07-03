'use client';
import { formatNumber } from '@/lib/format';
import { safeRevenue } from '@/lib/sales/revenue';
import { MonthRankTable } from './MonthRankTable';
import { CategoryDetailGrid } from './CategoryDetailGrid';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

/**
 * SingleMonthView — 월 상세 보기 (PeriodBar 'single' 모드)
 *
 * 구성:
 *   1. 상단 KPI 카드 (전체 판매량 + 총 매출액)
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
}) {
  const safePeriod = period && typeof period === 'object' ? period : null;
  const safeDetail = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : null;
  const total = Number.isFinite(Number(safeDetail?.total)) ? Number(safeDetail.total) : 0;
  const revenueTotal = safeRevenue(safeDetail?.revenueTotal);
  const selectedCategory = asDisplayText(category);
  const handleCategoryChange = typeof onCategoryChange === 'function' ? onCategoryChange : () => {};
  const safeMenus = asObjectArray(menus);
  const safeCategories = asStringArray(categories);

  return (
    <>
      <div className="hero-row" style={{ marginTop: 16 }}>
        <div className="card kpi-card">
          <div>
            <div className="label">전체 판매량</div>
            <div className="value num">
              {formatNumber(total)}
              <span className="unit">개</span>
            </div>
            <div className="trend">
              <span style={{ color: 'var(--text-3)' }}>
                {safePeriod
                  ? `${asDisplayText(safePeriod.year, '-')}년 ${asDisplayText(safePeriod.month, '-')}월 기준`
                  : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="card kpi-card">
          <div>
            <div className="label">총 매출액</div>
            <div className="value num">
              {formatNumber(revenueTotal)}
              <span className="unit">원</span>
            </div>
            <div className="trend">
              <span style={{ color: 'var(--text-3)' }}>업로드 매출액 합계</span>
            </div>
          </div>
        </div>
      </div>

      <CategoryDetailGrid
        detail={safeDetail}
        onCategoryClick={c => handleCategoryChange(c === selectedCategory ? null : c)}
      />

      <MonthRankTable
        menus={safeMenus}
        categories={safeCategories}
        category={selectedCategory}
        onCategoryChange={handleCategoryChange}
        total={total}
      />
    </>
  );
}
