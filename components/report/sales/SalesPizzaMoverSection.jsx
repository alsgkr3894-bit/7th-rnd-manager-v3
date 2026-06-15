'use client';
import { SalesMoverRow, SalesRankRow } from '@/components/report/sales/SalesChartRows';
import { isPizzaCategory } from '@/lib/menu-master/category-policy';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { SectionDot, S_MOVER_LABEL, S_SECTION_TITLE_FLEX } from './SalesReportSectionParts';

export function SalesPizzaMoverSection({ catShares, groupRanking }) {
  const all = groupRanking.filter(item =>
    isPizzaCategory(item.category, { includePersonal: false })
  );
  if (all.length === 0) return null;

  const pizzaColor =
    catShares.find(category => asDisplayText(category.name).includes('피자'))?.color || '#E1101F';

  const pizzaItems = all.filter(item => item.prevQty > 0);
  const risers = [...pizzaItems].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const fallers = [...pizzaItems].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const maxAbs = Math.max(...pizzaItems.map(item => Math.abs(item.delta)), 1);

  const count = Math.min(5, Math.floor(all.length / 2));
  const best = all.slice(0, count);
  const worst = all.slice(-count).reverse();
  const bestMax = safeQuantity(best[0]?.quantity) || 1;

  return (
    <div className="paper-section">
      <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
        <SectionDot color={pizzaColor} />
        피자 전월 대비 상승 / 하락 TOP 5
      </div>

      {pizzaItems.length > 0 ? (
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: 'var(--positive)' }}>▲ 상승 TOP 5</div>
            {risers.map(item => (
              <SalesMoverRow key={item.name} m={item} up maxAbs={maxAbs} />
            ))}
          </div>
          <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: 'var(--negative)' }}>▼ 하락 TOP 5</div>
            {fallers.map(item => (
              <SalesMoverRow key={item.name} m={item} up={false} maxAbs={maxAbs} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>
          전월 데이터가 없어 전월 대비를 표시할 수 없습니다.
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: pizzaColor }}>▲ 베스트 5</div>
            {best.map(item => (
              <SalesRankRow
                key={item.name}
                m={item}
                accent={pizzaColor}
                valueColor={pizzaColor}
                bestMax={bestMax}
              />
            ))}
          </div>
          <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...S_MOVER_LABEL, color: 'var(--text-3)' }}>▼ 워스트 5</div>
            {worst.map(item => (
              <SalesRankRow
                key={item.name}
                m={item}
                accent="#94A3B8"
                valueColor="var(--text-3)"
                bestMax={bestMax}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
