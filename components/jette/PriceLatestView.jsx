'use client';
import { useEffect, useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { usePagination } from '@/hooks/usePagination';
import { formatNumber } from '@/lib/format';
import { downloadCsv } from '@/lib/download';
import { getPriceRowsByFileId } from '@/lib/price';
import { PriceLatestKpi } from './PriceLatestKpi';
import { TypeSelect } from './_TypeSelect';
import { sortByKey, getProductTypeCounts } from '@/lib/jette/utils';

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

  const typeCounts = useMemo(
    () => getProductTypeCounts(rows, productTypeLookup),
    [rows, productTypeLookup],
  );

  const typeFilteredRows = useMemo(() => {
    if (typeFilter === 'all') return rows;
    return rows.filter(r => productTypeLookup.get(r.productCode)?.productType === typeFilter);
  }, [rows, typeFilter, productTypeLookup]);

  const taxCounts = useMemo(() => ({
    taxable: typeFilteredRows.filter(r => r.taxType === '과세').length,
    exempt:  typeFilteredRows.filter(r => r.taxType === '면세').length,
  }), [typeFilteredRows]);

  const filtered = useMemo(() => {
    let list = typeFilteredRows;
    if (taxFilter !== 'all') list = list.filter(r => r.taxType === taxFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q)
      || (r.productCode || '').toLowerCase().includes(q)
    );
    return sortByKey(list, sortKey, sortDir);
  }, [typeFilteredRows, search, taxFilter, sortKey, sortDir]);
  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 80);

  function exportCsv() {
    const headers = ['제품코드', '제품명', '분류', '과세구분', '판매단위', '온도', '단가', '부가세포함가'];
    const body = filtered.map(r => [
      r.productCode || '',
      r.productName || '',
      productTypeLookup.get(r.productCode)?.productType || '',
      r.taxType || '',
      r.salesUnit || '',
      r.temperature || '',
      r.price ?? '',
      r.priceWithTax ?? '',
    ]);
    downloadCsv([headers, ...body], '제때_최신단가.csv');
  }

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
          <button className="btn sm" onClick={exportCsv} disabled={filtered.length === 0}>
            CSV 내보내기
          </button>
        </div>

        {/* 분류 필터 */}
        <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:8}}>
          <Chip label="전체"   count={rows.length}               active={typeFilter === 'all'}              onClick={() => setTypeFilter('all')}/>
          <Chip label="전용"   count={typeCounts.exclusive}      active={typeFilter === 'exclusive'}        onClick={() => setTypeFilter('exclusive')}/>
          <Chip label="범용"   count={typeCounts.generic}        active={typeFilter === 'generic'}          onClick={() => setTypeFilter('generic')}/>
          <Chip label="범용관리" count={typeCounts['generic-managed']} active={typeFilter === 'generic-managed'} onClick={() => setTypeFilter('generic-managed')}/>
        </div>

        {/* 과세 필터 — typeFilter 적용 후 카운트 */}
        <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
          <Chip label="전체" count={typeFilteredRows.length} active={taxFilter === 'all'}  onClick={() => setTaxFilter('all')}/>
          <Chip label="과세" count={taxCounts.taxable}       active={taxFilter === '과세'} onClick={() => setTaxFilter('과세')}/>
          <Chip label="면세" count={taxCounts.exempt}        active={taxFilter === '면세'} onClick={() => setTaxFilter('면세')}/>
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
                  <th style={{width:100}}>분류</th>
                  <SortableTh sortKey="taxType"     active={sortKey} dir={sortDir} onClick={toggleSort} width={90}>과세구분</SortableTh>
                  <SortableTh sortKey="salesUnit"   active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>판매단위</SortableTh>
                  <SortableTh sortKey="temperature" active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>온도</SortableTh>
                  <SortableTh sortKey="price"        active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>단가</SortableTh>
                  <SortableTh sortKey="priceWithTax" active={sortKey} dir={sortDir} onClick={toggleSort} width={140} right>부가세포함가</SortableTh>
                </tr>
              </thead>
              <tbody>
                {paged.map((row, i) => (
                  <tr key={`${row.productCode || row.productName}-${i}`}>
                    <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{row.productCode || '-'}</td>
                    <td className="cell-name"><div className="menu-name">{row.productName}</div></td>
                    <td>
                      <TypeSelect
                        productCode={row.productCode}
                        productName={row.productName}
                        productTypeLookup={productTypeLookup}
                        onTypeChange={onTypeChange}
                      />
                    </td>
                    <td>
                      <span className="chip" style={{
                        background: row.taxType === '과세' ? 'var(--accent-soft)' : 'var(--surface-2)',
                        color:      row.taxType === '과세' ? 'var(--accent-text)' : 'var(--text-2)',
                      }}>{row.taxType || '-'}</span>
                    </td>
                    <td style={{color:'var(--text-2)', fontSize:13}}>{row.salesUnit || '-'}</td>
                    <td style={{color:'var(--text-2)', fontSize:13}}>{row.temperature || '-'}</td>
                    <td className="num right">{formatNumber(row.price)}<span className="unit">원</span></td>
                    <td className="num right" style={{fontWeight:700}}>
                      {formatNumber(row.priceWithTax)}<span className="unit">원</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPage={goTo} total={total} pageSize={80} />
          </div>
        )}
      </div>
    </>
  );
}
