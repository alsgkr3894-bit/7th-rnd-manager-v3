'use client';
import { asDisplayText, asFiniteNumber } from '@/lib/ui/prop-guards';
import { safeQuantity, safePercentWidth } from '@/lib/report/period';
import { formatNumber } from '@/lib/format';

/** 피자 전월 대비 상승/하락 행. maxAbs는 바 너비 계산에 사용. */
export function SalesMoverRow({ m, up, maxAbs }) {
  const row = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  const name = asDisplayText(row.name, '—');
  const delta = safeQuantity(row.delta);
  const quantity = safeQuantity(row.quantity);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{ height: 5, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${safePercentWidth(delta, maxAbs)}%`,
              height: '100%',
              background: up ? 'var(--positive)' : 'var(--negative)',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 52 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: up ? 'var(--positive)' : 'var(--negative)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {up ? '+' : ''}
          {formatNumber(delta)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(quantity)}건
        </div>
      </div>
    </div>
  );
}

/** 피자 베스트/워스트 순위 행. bestMax는 바 너비 계산에 사용. */
export function SalesRankRow({ m, accent, valueColor, bestMax }) {
  const row = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  const name = asDisplayText(row.name, '—');
  const quantity = safeQuantity(row.quantity);
  const rank = asFiniteNumber(row.rank, 0) ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{ height: 5, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${safePercentWidth(quantity, bestMax)}%`,
              height: '100%',
              background: accent,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 52 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: valueColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatNumber(quantity)}건
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>
          전체 {rank}위
        </div>
      </div>
    </div>
  );
}
