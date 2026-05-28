'use client';
import { useEffect, useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { formatNumber } from '@/lib/format';
import { getPriceRowsByFileId } from '@/lib/price';
import { PriceLatestKpi } from './PriceLatestKpi';

const typeInputStyle = {
  padding:'3px 6px', borderRadius:6, fontSize:12,
  border:'1px solid var(--border)', background:'var(--surface-2)',
  color:'var(--text-1)', cursor:'pointer',
};

export function PriceLatestView({ files, latestFileId, onLatestChange, productTypeLookup = new Map(), onTypeChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [taxFilter, setTaxFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState('productName');
  const [sortDir, setSortDir] = useState('asc');

  const latestFile = files.find(f => f.id === latestFileId);

  useEffect(() => {
    setTypeFilter('all');
    setTaxFilter('all');
    setSearch('');
  }, [latestFileId]);

  useEffect(() => {
    (async () => {
      if (!latestFileId) { setRows([]); return; }
      try {
        const r = await getPriceRowsByFileId(latestFileId);
        setRows(r);
      } catch (err) {
        console.warn('[jette-price] rows 로드 실패:', err);
        setRows([]);
      }
    })();
  }, [latestFileId]);

  const typeCounts = useMemo(() => {
    const get = (type) => rows.filter(r => productTypeLookup.get(r.productCode)?.productType === type).length;
    return {
      exclusive:         get('exclusive'),
      generic:           get('generic'),
      'generic-managed': get('generic-managed'),
    };
  }, [rows, productTypeLookup]);

  const filtered = useMemo(() => {
    let list = rows;
    if (taxFilter !== 'all') list = list.filter(r => r.taxType === taxFilter);
    if (typeFilter !== 'all') {
      list = list.filter(r => productTypeLookup.get(r.productCode)?.productType === typeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q)
      || (r.productCode || '').toLowerCase().includes(q)
    );
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb, 'ko') * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [rows, search, taxFilter, typeFilter, sortKey, sortDir, productTypeLookup]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'productName' || key === 'productCode' ? 'asc' : 'desc'); }
  }

  if (files.length === 0) {
    return (
      <div className="card" style={{marginTop:16, padding:'40px 24px', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
        업로드된 가격 파일이 없습니다
      </div>
    );
  }

  return (
    <>
      <PriceLatestKpi
        latestFile={latestFile}
        rows={rows}
        files={files}
        latestFileId={latestFileId}
        onLatestChange={onLatestChange}
      />

      <div className="card" style={{marginTop:16}}>
        <div className="card-header">
          <div>
            <div className="card-title">단가 목록</div>
            <div className="card-sub">{formatNumber(filtered.length)} / {formatNumber(rows.length)}개 표시</div>
          </div>
        </div>

        {/* 분류 필터 */}
        <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:8}}>
          <Chip label="전체"   count={rows.length}               active={typeFilter === 'all'}              onClick={() => setTypeFilter('all')}/>
          <Chip label="전용"   count={typeCounts.exclusive}      active={typeFilter === 'exclusive'}        onClick={() => setTypeFilter('exclusive')}/>
          <Chip label="범용"   count={typeCounts.generic}        active={typeFilter === 'generic'}          onClick={() => setTypeFilter('generic')}/>
          <Chip label="범용관리" count={typeCounts['generic-managed']} active={typeFilter === 'generic-managed'} onClick={() => setTypeFilter('generic-managed')}/>
        </div>

        {/* 과세 필터 — typeFilter 적용 후 카운트 */}
        {(() => {
          const typeRows = typeFilter === 'all' ? rows
            : rows.filter(r => productTypeLookup.get(r.productCode)?.productType === typeFilter);
          return (
            <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
              <Chip label="전체" count={typeRows.length}                                            active={taxFilter === 'all'}  onClick={() => setTaxFilter('all')}/>
              <Chip label="과세" count={typeRows.filter(r => r.taxType === '과세').length}          active={taxFilter === '과세'} onClick={() => setTaxFilter('과세')}/>
              <Chip label="면세" count={typeRows.filter(r => r.taxType === '면세').length}          active={taxFilter === '면세'} onClick={() => setTaxFilter('면세')}/>
            </div>
          );
        })()}

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
                  <SortableTh sortKey="productCode" active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>제품코드</SortableTh>
                  <SortableTh sortKey="productName" active={sortKey} dir={sortDir} onClick={toggleSort}>제품명</SortableTh>
                  <th style={{width:100}}>분류</th>
                  <SortableTh sortKey="taxType"     active={sortKey} dir={sortDir} onClick={toggleSort} width={90}>과세구분</SortableTh>
                  <SortableTh sortKey="salesUnit"   active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>판매단위</SortableTh>
                  <SortableTh sortKey="temperature" active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>온도</SortableTh>
                  <SortableTh sortKey="price"        active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>단가</SortableTh>
                  <SortableTh sortKey="priceWithTax" active={sortKey} dir={sortDir} onClick={toggleSort} width={140} right>부가세포함가</SortableTh>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.productCode || r.productName}-${i}`}>
                    <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{r.productCode || '-'}</td>
                    <td className="cell-name"><div className="menu-name">{r.productName}</div></td>
                    <td>
                      <TypeSelect
                        productCode={r.productCode}
                        productName={r.productName}
                        productTypeLookup={productTypeLookup}
                        onTypeChange={onTypeChange}
                      />
                    </td>
                    <td>
                      <span className="chip" style={{
                        background: r.taxType === '과세' ? 'var(--accent-soft)' : 'var(--surface-2)',
                        color:      r.taxType === '과세' ? 'var(--accent-text)' : 'var(--text-2)',
                      }}>{r.taxType || '-'}</span>
                    </td>
                    <td style={{color:'var(--text-2)', fontSize:13}}>{r.salesUnit || '-'}</td>
                    <td style={{color:'var(--text-2)', fontSize:13}}>{r.temperature || '-'}</td>
                    <td className="num right">{formatNumber(r.price)}<span className="unit">원</span></td>
                    <td className="num right" style={{fontWeight:700}}>
                      {formatNumber(r.priceWithTax)}<span className="unit">원</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function TypeSelect({ productCode, productName, productTypeLookup, onTypeChange }) {
  const current = productCode ? productTypeLookup.get(productCode)?.productType || '' : '';
  return (
    <select
      value={current}
      onChange={e => {
        if (e.target.value && onTypeChange) onTypeChange(productCode, productName, e.target.value);
      }}
      style={typeInputStyle}
    >
      <option value="">미분류</option>
      <option value="exclusive">전용</option>
      <option value="generic">범용</option>
      <option value="generic-managed">범용관리</option>
    </select>
  );
}
