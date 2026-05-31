'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { PriceHistoryModal } from '@/components/cost/ingredient-price/PriceHistoryModal';

export function MasterRow({ r, onRegClick }) {
  const [showNote,    setShowNote]    = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const note = r.meta?.note || '';

  const vatLabel = r.priceWithTax != null ? `${formatNumber(r.priceWithTax)}원` : '—';

  const packLabel = r.baseQuantity
    ? `${formatNumber(r.baseQuantity)} ${r.baseUnitType || 'g'}`
    : '—';

  const uPrice = r.unitPrice;
  const unitPriceLabel = uPrice != null
    ? `${uPrice < 1 ? uPrice.toFixed(2) : uPrice % 1 === 0 ? formatNumber(uPrice) : uPrice.toFixed(1)}원/${r.baseUnitType || 'g'}`
    : '—';

  let deltaNode;
  if (r.isNew) {
    deltaNode = <span style={{fontSize:11, padding:'1px 6px', borderRadius:4,
      background:'rgba(56,189,248,.15)', color:'var(--accent, #38bdf8)', fontWeight:700}}>신규</span>;
  } else if (r.priceDelta == null) {
    deltaNode = <span style={{color:'var(--text-4)', fontSize:12}}>—</span>;
  } else if (r.priceDelta === 0) {
    deltaNode = <span style={{color:'var(--text-3)', fontSize:12}}>변동없음</span>;
  } else {
    const color = r.priceDelta > 0 ? 'var(--negative, #ef4444)' : 'var(--positive, #10b981)';
    deltaNode = (
      <span style={{color, fontWeight:700, fontSize:13}}>
        {r.priceDelta > 0 ? '+' : ''}{formatNumber(r.priceDelta)}원
      </span>
    );
  }

  return (
    <>
      <tr>
        <td style={{color:'var(--text-3)', fontSize:11, fontFamily:'monospace'}}>
          {r.productCode || '—'}
        </td>
        <td>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{fontWeight:600, fontSize:13}}>{r.masterName || r.productName || '—'}</span>
            {r.isLinked
              ? <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, fontWeight:700,
                  background:'rgba(56,189,248,.15)', color:'var(--accent, #38bdf8)', flexShrink:0}}>제때</span>
              : <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, fontWeight:700,
                  background:'var(--surface-3)', color:'var(--text-3)', flexShrink:0}}>수동</span>
            }
          </div>
          {r.isLinked && r.productName && r.productName !== r.masterName && (
            <div style={{fontSize:11, color:'var(--text-3)', marginTop:1}}>제때: {r.productName}</div>
          )}
          {r.supplierName && (
            <div style={{fontSize:10, color:'var(--text-4)', marginTop:2}}>
              공급: {r.supplierName}
            </div>
          )}
        </td>
        <td style={{textAlign:'right', fontSize:13, fontWeight:600}}>
          {vatLabel}
          {r.taxType === '면세' && r.priceWithTax != null && (
            <span style={{marginLeft:4, fontSize:10, color:'var(--text-3)', fontWeight:400}}>면세</span>
          )}
        </td>
        <td style={{fontSize:12, color: r.baseQuantity ? 'var(--text-2)' : 'var(--text-4)'}}>
          {packLabel}
        </td>
        <td style={{textAlign:'right', fontSize:12,
          color: uPrice != null ? 'var(--accent, #38bdf8)' : 'var(--text-4)',
          fontWeight: uPrice != null ? 600 : undefined}}>
          {unitPriceLabel}
        </td>
        <td style={{textAlign:'right'}}>{deltaNode}</td>
        <td>
          {note && (
            <button
              onClick={() => setShowNote(v => !v)}
              style={{border:0, background:'transparent', cursor:'pointer', padding:'2px 4px',
                color: showNote ? 'var(--accent)' : 'var(--text-4)', lineHeight:1}}
              title="비고 보기">
              <Icon.note style={{width:14, height:14}}/>
            </button>
          )}
        </td>
        <td>
          <div style={{display:'flex', gap:4, alignItems:'center'}}>
            {r.meta?.id != null && (
              <button className="btn xs"
                onClick={() => setShowHistory(true)}
                title="단가 변경 이력">
                이력
              </button>
            )}
            <button className="btn xs"
              onClick={onRegClick} title="포장단위·분류 수정">
              수정
            </button>
          </div>
        </td>
      </tr>
      {showHistory && r.meta?.id != null && (
        <PriceHistoryModal
          ingredientId={r.meta.id}
          ingredientName={r.masterName || r.productName || r.productCode}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showNote && note && (
        <tr>
          <td colSpan={8} style={{
            background:'var(--surface-2)', fontSize:12, color:'var(--text-2)',
            padding:'6px 14px 8px', borderTop:0,
          }}>
            <span style={{color:'var(--text-4)', marginRight:6, fontSize:11}}>비고</span>
            {note}
          </td>
        </tr>
      )}
    </>
  );
}
