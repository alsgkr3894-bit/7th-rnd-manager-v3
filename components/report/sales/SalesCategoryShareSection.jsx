'use client';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function SalesCategoryShareSection({ catShares, totalShare }) {
  if (catShares.length === 0) return null;

  return (
    <div className="paper-section">
      <div className="paper-section-title">카테고리별 판매 비중</div>
      <div className="share-stack" style={{ marginTop: 10 }}>
        {catShares.map(category => (
          <div
            key={asDisplayText(category.name, '미분류')}
            className="share-seg"
            style={{ flex: safeQuantity(category.value), background: category.color }}
            title={`${asDisplayText(category.name, '미분류')} ${
              totalShare > 0 ? ((safeQuantity(category.value) / totalShare) * 100).toFixed(1) : 0
            }%`}
          />
        ))}
      </div>
      <div className="paper-legend">
        {catShares.map(category => (
          <div className="paper-legend-item" key={asDisplayText(category.name, '미분류')}>
            <span className="dot" style={{ background: category.color }} />
            <span>{asDisplayText(category.name, '미분류')}</span>
            <span className="num muted">{formatNumber(safeQuantity(category.value))}건</span>
            <span className="num" style={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
              {totalShare > 0 ? ((safeQuantity(category.value) / totalShare) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
