'use client';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { safeQuantity } from '@/lib/report/period';

export function safeProductName(product) {
  return asDisplayText(product.normalizedProductName) || asDisplayText(product.productName) || '—';
}

export function typeLabel(p) {
  return p.productType === 'exclusive' ? '전용' : p.isManaged ? '관리품목' : '범용';
}

export function ShipmentItemTable({ items, maxQty }) {
  const safeItems = asObjectArray(items);
  const safeMaxQty = Math.max(0, safeQuantity(maxQty));

  return (
    <table className="paper-table">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>제품명</th>
          <th style={{ width: 90, textAlign: 'right' }}>출고량</th>
          <th style={{ width: 100, textAlign: 'right' }}>출고금액</th>
        </tr>
      </thead>
      <tbody>
        {safeItems.map((p, i) => {
          const totalQuantity = safeQuantity(p.totalQuantity);
          const totalAmount = safeQuantity(p.totalAmount);
          const pct =
            safeMaxQty > 0 ? Math.min(100, Math.max(0, (totalQuantity / safeMaxQty) * 100)) : 0;
          const isManaged = !!p.isManaged;
          const productCode = asDisplayText(p.productCode);
          const productName = safeProductName(p);

          return (
            <tr
              key={productCode || `${productName}-${i}`}
              style={isManaged ? { background: 'var(--warn-soft)' } : undefined}
            >
              <td className="num">{i + 1}</td>
              <td style={isManaged ? { borderLeft: '3px solid var(--warn)' } : undefined}>
                <div
                  style={{
                    marginBottom: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{productName}</span>
                  {isManaged && (
                    <span
                      style={{
                        background: 'var(--warn)',
                        color: 'var(--surface)',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      관리품목
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--surface-2)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: isManaged ? 'var(--warn)' : 'var(--accent)',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </td>
              <td className="num right">{formatNumber(totalQuantity)}</td>
              <td className="num right muted">{formatNumber(totalAmount)}원</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
