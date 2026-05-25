'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { formatNumber } from '@/lib/format';

/**
 * ShipmentTable — 단일 파일 집계 테이블
 *
 * @param {Array} aggRows — aggregateShipmentRows 결과
 */
export function ShipmentTable({ aggRows }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | exclusive | generic
  const [managedOnly, setManagedOnly] = useState(false);
  const [sortKey, setSortKey] = useState('totalAmount');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let list = aggRows;
    if (typeFilter !== 'all') list = list.filter(r => r.productType === typeFilter);
    if (managedOnly)          list = list.filter(r => r.isManaged);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q)
      || (r.productCode || '').toLowerCase().includes(q)
    );
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'productType') {
        const order = { exclusive: 0, generic: 1 };
        va = order[va] ?? 9;
        vb = order[vb] ?? 9;
      }
      if (sortKey === 'isManaged') {
        va = va ? 1 : 0;
        vb = vb ? 1 : 0;
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb, 'ko') * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [aggRows, search, typeFilter, managedOnly, sortKey, sortDir]);

  const counts = useMemo(() => ({
    all:         aggRows.length,
    exclusive:   aggRows.filter(r => r.productType === 'exclusive').length,
    generic:     aggRows.filter(r => r.productType === 'generic').length,
    managed:     aggRows.filter(r => r.isManaged).length,
  }), [aggRows]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">출고량 집계</div>
          <div className="card-sub">{formatNumber(filtered.length)} / {formatNumber(aggRows.length)}개 표시</div>
        </div>
      </div>

      {/* 분류 필터 + 관리품목 토글 */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12, alignItems:'center'}}>
        <Chip label="전체"     count={counts.all}        active={typeFilter === 'all'}       onClick={() => setTypeFilter('all')}/>
        <Chip label="전용상품" count={counts.exclusive}  active={typeFilter === 'exclusive'} onClick={() => setTypeFilter('exclusive')}/>
        <Chip label="범용상품" count={counts.generic}    active={typeFilter === 'generic'}   onClick={() => setTypeFilter('generic')}/>
        <span style={{width:1, height:18, background:'var(--border)', margin:'0 4px'}}/>
        <Chip label="관리품목만" count={counts.managed} active={managedOnly} onClick={() => setManagedOnly(v => !v)}/>
      </div>

      <SearchBox value={search} onChange={setSearch}/>

      {filtered.length === 0 ? (
        <div style={{padding:'32px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          조건에 맞는 항목이 없습니다
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh sortKey="productCode"   active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>제품코드</SortableTh>
                <SortableTh sortKey="productName"   active={sortKey} dir={sortDir} onClick={toggleSort}>제품명</SortableTh>
                <SortableTh sortKey="unit"          active={sortKey} dir={sortDir} onClick={toggleSort} width={90}>단위</SortableTh>
                <SortableTh sortKey="temperature"   active={sortKey} dir={sortDir} onClick={toggleSort} width={90}>온도</SortableTh>
                <SortableTh sortKey="taxType"       active={sortKey} dir={sortDir} onClick={toggleSort} width={80}>과세</SortableTh>
                <SortableTh sortKey="totalQuantity"  active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>총 출고량</SortableTh>
                <SortableTh sortKey="priceWithTax"   active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>부가세포함가</SortableTh>
                <SortableTh sortKey="totalAmount"    active={sortKey} dir={sortDir} onClick={toggleSort} width={140} right>총 출고 금액</SortableTh>
                <SortableTh sortKey="productType" active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>분류</SortableTh>
                <SortableTh sortKey="isManaged"   active={sortKey} dir={sortDir} onClick={toggleSort} width={80}>관리</SortableTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => <Row key={`${r.productCode || r.productName}-${i}`} r={r}/>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ r }) {
  return (
    <tr>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{r.productCode || '-'}</td>
      <td className="cell-name"><div className="menu-name">{r.productName}</div></td>
      <td style={{color:'var(--text-2)', fontSize:13}}>{r.unit || '-'}</td>
      <td style={{color:'var(--text-2)', fontSize:13}}>{r.temperature || '-'}</td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.taxType || '-'}</td>
      <td className="num right" style={{fontWeight:700}}>
        {formatNumber(r.totalQuantity)}<span className="unit">건</span>
      </td>
      <td className="num right">
        {r.priceWithTax != null
          ? `${formatNumber(r.priceWithTax)}원`
          : <span className="chip" style={{background:'var(--warn-soft)', color:'var(--warn)', fontSize:11}}>단가 미연동</span>}
      </td>
      <td className="num right" style={{fontWeight:700}}>
        {formatNumber(r.totalAmount)}<span className="unit">원</span>
      </td>
      <td>
        <ProductTypeChip type={r.productType}/>
      </td>
      <td style={{textAlign:'center'}}>
        {r.isManaged
          ? <span title="관리품목" style={{color:'var(--warn)', fontSize:14}}>★</span>
          : <span style={{color:'var(--text-4)', fontSize:12}}>—</span>}
      </td>
    </tr>
  );
}

const PRODUCT_TYPE_META = {
  exclusive: { label: '전용상품', bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  generic:   { label: '범용상품', bg: 'var(--surface-2)',   color: 'var(--text-3)' },
};

function ProductTypeChip({ type }) {
  const meta = PRODUCT_TYPE_META[type] || PRODUCT_TYPE_META.generic;
  return (
    <span className="chip" style={{background: meta.bg, color: meta.color}}>
      {meta.label}
    </span>
  );
}

