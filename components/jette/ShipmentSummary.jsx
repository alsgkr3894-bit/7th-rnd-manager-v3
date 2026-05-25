'use client';
import { useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { formatNumber } from '@/lib/format';

/**
 * ShipmentSummary — 출고량 요약 4카드 + 카테고리 multi-select 필터
 *
 * - 카테고리 chip 3개 (전체 / 전용상품 / 범용상품)
 * - "전체"는 두 카테고리 동시 선택/해제 (모두 선택 시 active)
 * - 카테고리는 multi-select 토글
 * - "관리품목만" 보조 토글 (선택된 카테고리 중 isManaged=true만)
 */
const TYPE_OPTIONS = [
  { value: 'exclusive',  label: '전용상품' },
  { value: 'generic',    label: '범용상품' },
];
const ALL_TYPES = TYPE_OPTIONS.map(o => o.value);

export function ShipmentSummary({ aggRows, managedCount }) {
  const [selectedTypes, setSelectedTypes] = useState(new Set(ALL_TYPES));
  const [managedOnly, setManagedOnly] = useState(false);
  const isAll = selectedTypes.size === ALL_TYPES.length;

  function toggleType(t) {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }
  function clickAll() {
    setSelectedTypes(isAll ? new Set() : new Set(ALL_TYPES));
  }

  const counts = useMemo(() => ({
    exclusive: aggRows.filter(r => r.productType === 'exclusive').length,
    generic:   aggRows.filter(r => r.productType === 'generic').length,
    managed:   aggRows.filter(r => r.isManaged).length,
  }), [aggRows]);

  const filtered = useMemo(() => {
    let list = aggRows.filter(r => selectedTypes.has(r.productType));
    if (managedOnly) list = list.filter(r => r.isManaged);
    return list;
  }, [aggRows, selectedTypes, managedOnly]);

  const summary = useMemo(() => {
    const totalQty = filtered.reduce((s, r) => s + (r.totalQuantity || 0), 0);
    const totalAmt = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const max      = filtered.length > 0
      ? filtered.reduce((m, r) => r.totalQuantity > m.totalQuantity ? r : m, filtered[0])
      : null;
    return { totalQty, totalAmt, max };
  }, [filtered]);

  const baseLabel = isAll
    ? '전체 카테고리'
    : selectedTypes.size === 0
      ? '카테고리 미선택'
      : TYPE_OPTIONS.filter(o => selectedTypes.has(o.value)).map(o => o.label).join(' + ');
  const filterLabel = managedOnly ? `${baseLabel} · 관리품목` : baseLabel;

  return (
    <>
      {/* 카테고리 multi-select chip + 관리품목 토글 */}
      <div style={{
        display:'flex', gap:6, flexWrap:'wrap', marginTop:16,
        alignItems:'center',
      }}>
        <span style={{fontSize:12, color:'var(--text-3)', marginRight:4}}>요약 필터</span>
        <Chip label="전체" count={aggRows.length} active={isAll} onClick={clickAll}/>
        {TYPE_OPTIONS.map(o => (
          <Chip
            key={o.value}
            label={o.label}
            count={counts[o.value]}
            active={selectedTypes.has(o.value) && !isAll}
            dim={isAll}
            onClick={() => toggleType(o.value)}
          />
        ))}
        <span style={{width:1, height:18, background:'var(--border)', margin:'0 4px'}}/>
        <Chip label="관리품목만" count={counts.managed} active={managedOnly} onClick={() => setManagedOnly(v => !v)}/>
        <span style={{
          marginLeft:'auto', fontSize:11, color:'var(--text-3)',
        }}>{filtered.length}개 제품 합산</span>
      </div>

      <div className="hero-row" style={{marginTop:12}}>
        <Card label="총 출고량" value={`${formatNumber(summary.totalQty)}`} unit="건"
          foot={`${filterLabel} · ${filtered.length}개 제품`}/>
        <Card label="총 출고 금액" value={`${formatNumber(summary.totalAmt)}`} unit="원"
          foot="선택 카테고리 출고 금액 합계"/>
        <Card
          label="최다 출고 제품"
          value={summary.max ? summary.max.productName : '—'}
          small
          foot={summary.max ? `${formatNumber(summary.max.totalQuantity)}건` : '데이터 없음'}
          footColor="var(--accent-text)"
        />
        <Card label="대상 제품" value={`${filtered.length}`} unit={`/ ${managedCount}`}
          foot="선택 카테고리 출고 제품 수"/>
      </div>
    </>
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

