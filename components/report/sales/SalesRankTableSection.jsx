'use client';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { SectionDot, S_EMPTY_STATE, S_SECTION_TITLE_FLEX } from './SalesReportSectionParts';
import { SalesCategoryBarRows } from './SalesCategoryBarRows';
import { SalesRankTable } from './SalesRankTable';

export function SalesRankTableSection({ opts, periodLabel, catShares, groupRanking }) {
  if (groupRanking.length === 0) {
    return (
      <div className="paper-section">
        <div style={S_EMPTY_STATE}>데이터 없음</div>
      </div>
    );
  }

  const catOrder = catShares.map(category => asDisplayText(category.name, '미분류'));
  const grouped = {};
  for (const item of groupRanking) {
    const category = asDisplayText(item.category, '미분류') || '미분류';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  }
  const categories = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
    category => grouped[category]
  );

  return categories.map(category => {
    const items = grouped[category];
    const catColor =
      catShares.find(item => asDisplayText(item.name) === category)?.color || '#6B7280';
    const catTotal = items.reduce((sum, item) => sum + safeQuantity(item.quantity), 0);

    return (
      <div className="paper-section paper-cat-section" key={category}>
        <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
          <SectionDot color={catColor} />
          {category} 순위 — {periodLabel}
          <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
            합계 {formatNumber(catTotal)}건
          </span>
        </div>

        {opts.catBar && (
          <SalesCategoryBarRows items={items} catColor={catColor} catTotal={catTotal} />
        )}

        <SalesRankTable items={items} opts={opts} />
      </div>
    );
  });
}
