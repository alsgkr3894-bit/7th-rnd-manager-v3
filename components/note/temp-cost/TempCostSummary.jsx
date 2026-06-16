'use client';

import { nonNeg, tempCostRateColor } from './tempCostUtils';

export function TempCostSummary({ totalCost, costRate, sellingPrice, onSellingPriceChange }) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '8px 16px',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>식재료 원가 합계</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textAlign: 'right' }}>
        {Math.round(totalCost).toLocaleString()}원
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          판매가 입력
        </span>
        <input
          className="form-input"
          style={{ width: 100, padding: '3px 8px', fontSize: 12 }}
          type="number"
          min="0"
          value={sellingPrice}
          onChange={event => onSellingPriceChange(nonNeg(event.target.value))}
          placeholder="판매가"
        />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>원</span>
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          textAlign: 'right',
          color: tempCostRateColor(costRate),
        }}
      >
        {costRate != null ? `${costRate}%` : '—'}
      </span>
    </div>
  );
}
