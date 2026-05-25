'use client';
import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';

/**
 * ShipmentSummary — 출고량 요약 4카드
 */
export function ShipmentSummary({ aggRows, managedCount }) {
  const summary = useMemo(() => {
    const totalQty = aggRows.reduce((s, r) => s + (r.totalQuantity || 0), 0);
    const totalAmt = aggRows.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const max      = aggRows.length > 0
      ? aggRows.reduce((m, r) => r.totalQuantity > m.totalQuantity ? r : m, aggRows[0])
      : null;
    return { totalQty, totalAmt, max };
  }, [aggRows]);

  return (
    <div className="hero-row" style={{marginTop:16}}>
      <Card label="총 출고량" value={`${formatNumber(summary.totalQty)}`} unit="건"
        foot={`대상 ${aggRows.length}개 제품 합계`}/>
      <Card label="총 출고 금액" value={`${formatNumber(summary.totalAmt)}`} unit="원"
        foot="대상 제품 매입액 합계"/>
      <Card
        label="최다 출고 제품"
        value={summary.max ? summary.max.productName : '—'}
        small
        foot={summary.max ? `${formatNumber(summary.max.totalQuantity)}건` : '데이터 없음'}
        footColor="var(--accent-text)"
      />
      <Card label="대상 제품" value={`${aggRows.length}`} unit={`/ ${managedCount}`}
        foot="관리 대상 중 출고된 제품"/>
    </div>
  );
}

function Card({ label, value, unit, foot, footColor, small }) {
  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num" style={small ? {
          fontSize:16, fontWeight:700,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        } : undefined}>
          {value}{unit && <span className="unit">{unit}</span>}
        </div>
        <div className="trend">
          <span style={{color: footColor || 'var(--text-3)', fontWeight: footColor ? 600 : undefined}}>{foot}</span>
        </div>
      </div>
    </div>
  );
}
