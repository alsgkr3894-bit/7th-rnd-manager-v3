'use client';
import { useEffect, useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { formatNumber } from '@/lib/format';
import { getPriceRowsByFileId } from '@/lib/price';
import { PriceLatestKpi } from './PriceLatestKpi';

/**
 * PriceLatestView — 최신 단가 현황 (단일 파일 기준)
 *
 * 컬럼: 제품코드 / 제품명 / 과세구분 / 판매단위 / 온도 / 단가 / 부가세포함가
 *
 * @param {Array} files
 * @param {number|null} latestFileId
 * @param {(id) => void} onLatestChange
 */
export function PriceLatestView({ files, latestFileId, onLatestChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [taxFilter, setTaxFilter] = useState('all'); // all | 과세 | 면세
  const [sortKey, setSortKey] = useState('productName');
  const [sortDir, setSortDir] = useState('asc');

  const latestFile = files.find(f => f.id === latestFileId);

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

  const filtered = useMemo(() => {
    let list = rows;
    if (taxFilter !== 'all') list = list.filter(r => r.taxType === taxFilter);
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
  }, [rows, search, taxFilter, sortKey, sortDir]);

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

      {/* 필터 */}
      <div className="card" style={{marginTop:16}}>
        <div className="card-header">
          <div>
            <div className="card-title">단가 목록</div>
            <div className="card-sub">{formatNumber(filtered.length)} / {formatNumber(rows.length)}개 표시</div>
          </div>
        </div>

        <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
          <Chip label="전체" count={rows.length}                                       active={taxFilter === 'all'}    onClick={() => setTaxFilter('all')}/>
          <Chip label="과세" count={rows.filter(r => r.taxType === '과세').length}     active={taxFilter === '과세'}    onClick={() => setTaxFilter('과세')}/>
          <Chip label="면세" count={rows.filter(r => r.taxType === '면세').length}     active={taxFilter === '면세'}    onClick={() => setTaxFilter('면세')}/>
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
                  <SortableTh sortKey="productCode" active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>제품코드</SortableTh>
                  <SortableTh sortKey="productName" active={sortKey} dir={sortDir} onClick={toggleSort}>제품명</SortableTh>
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

