'use client';
import { formatNumber } from '@/lib/format';

export function EdgeTotalSummary({ total }) {
  const color = Number(total) < 0 ? 'var(--negative)' : 'var(--accent)';

  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderRadius: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>총 원가</span>
      <span style={{ fontSize: 20, fontWeight: 800, color }}>
        {formatNumber(total)}
        <span style={{ fontSize: 13, marginLeft: 2 }}>원</span>
      </span>
    </div>
  );
}
