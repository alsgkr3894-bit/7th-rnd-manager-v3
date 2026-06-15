'use client';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function buildSalesCategoryBarMetrics({ item, index, itemCount, catTotal }) {
  const quantity = safeQuantity(item.quantity);
  const pct = catTotal > 0 ? (quantity / catTotal) * 100 : 0;
  const weight = 1 - index / Math.max(itemCount, 1);

  return {
    quantity,
    pct,
    dotOpacity: 0.5 + 0.5 * weight,
    barOpacity: 0.55 + 0.45 * weight,
    isTop: index === 0,
  };
}

export function SalesCategoryBarRow({ item, index, itemCount, catColor, catTotal }) {
  const { quantity, pct, dotOpacity, barOpacity, isTop } = buildSalesCategoryBarMetrics({
    item,
    index,
    itemCount,
    catTotal,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: catColor,
          flexShrink: 0,
          opacity: dotOpacity,
        }}
      />
      <div
        style={{
          width: 130,
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--text-2)',
          fontWeight: isTop ? 700 : 400,
        }}
      >
        {asDisplayText(item.name, '—')}
      </div>
      <div
        style={{
          flex: 1,
          height: 10,
          background: 'var(--surface-2)',
          borderRadius: 2,
          overflow: 'hidden',
          minWidth: 60,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: catColor,
            borderRadius: 2,
            opacity: barOpacity,
          }}
        />
      </div>
      <div
        style={{
          width: 38,
          textAlign: 'right',
          color: 'var(--text-3)',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pct.toFixed(1)}%
      </div>
      <div
        style={{
          width: 52,
          textAlign: 'right',
          color: 'var(--text-2)',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatNumber(quantity)}건
      </div>
    </div>
  );
}
