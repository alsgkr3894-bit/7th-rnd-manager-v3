'use client';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function SalesCategoryBarRows({ items, catColor, catTotal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '10px 0 14px' }}>
      {items.map((item, index) => {
        const quantity = safeQuantity(item.quantity);
        const pct = catTotal > 0 ? (quantity / catTotal) * 100 : 0;
        return (
          <div
            key={item.name}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: catColor,
                flexShrink: 0,
                opacity: 0.5 + 0.5 * (1 - index / items.length),
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
                fontWeight: index === 0 ? 700 : 400,
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
                  opacity: 0.55 + 0.45 * (1 - index / items.length),
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
      })}
    </div>
  );
}
