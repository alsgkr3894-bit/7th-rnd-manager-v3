'use client';
import { useEffect, useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { usePagination } from '@/hooks/usePagination';
import { formatNumber } from '@/lib/format';
import { downloadCsv } from '@/lib/download';
import { CHANGE_STATUS, CHANGE_STATUS_STYLE } from './managed-products-constants';
import { TypeSelect } from './_TypeSelect';
import { sortByKey, getProductTypeCounts } from '@/lib/jette/utils';

const FILTER_TO_STATUS = {
  up:      CHANGE_STATUS.UP,
  down:    CHANGE_STATUS.DOWN,
  same:    CHANGE_STATUS.SAME,
  new:     CHANGE_STATUS.NEW,
  deleted: CHANGE_STATUS.DELETED,
};

export function PriceCompareTable({ diffRows, productTypeLookup = new Map(), onTypeChange }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState('changeRate');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setTypeFilter('all');
    setFilter('all');
    setSearch('');
  }, [diffRows]);

  const typeCounts = useMemo(
    () => getProductTypeCounts(diffRows, productTypeLookup),
    [diffRows, productTypeLookup],
  );

  const counts = useMemo(() => ({
    all:     diffRows.length,
    up:      diffRows.filter(r => r.changeStatus === CHANGE_STATUS.UP).length,
    down:    diffRows.filter(r => r.changeStatus === CHANGE_STATUS.DOWN).length,
    same:    diffRows.filter(r => r.changeStatus === CHANGE_STATUS.SAME).length,
    new:     diffRows.filter(r => r.changeStatus === CHANGE_STATUS.NEW).length,
    deleted: diffRows.filter(r => r.changeStatus === CHANGE_STATUS.DELETED).length,
  }), [diffRows]);

  const filtered = useMemo(() => {
    let list = diffRows;
    if (filter !== 'all') list = list.filter(r => r.changeStatus === FILTER_TO_STATUS[filter]);
    if (typeFilter !== 'all') {
      list = list.filter(r => productTypeLookup.get(r.productCode)?.productType === typeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q)
      || (r.productCode || '').toLowerCase().includes(q)
    );
    return sortByKey(list, sortKey, sortDir);
  }, [diffRows, search, filter, typeFilter, sortKey, sortDir, productTypeLookup]);
  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 80);

  function exportCsv() {
    const headers = ['제품코드', '제품명', '분류', '이전 단가', '현재 단가', '변동액', '변동률', '상태'];
    const body = filtered.map(r => [
      r.productCode || '',
      r.productName || '',
      productTypeLookup.get(r.productCode)?.productType || '',
      r.basePrice ?? '',
      r.latestPrice ?? '',
      r.changeAmount ?? '',
      r.changeRate == null ? '' : (r.changeRate * 100).toFixed(1),
      r.changeStatus || '',
    ]);
    downloadCsv([headers, ...body], '제때_가격비교.csv');
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">가격 비교</div>
          <div className="card-sub">제품코드 우선 매칭 · 변동률 기준 정렬</div>
        </div>
        <button className="btn sm" onClick={exportCsv} disabled={filtered.length === 0}>
          CSV 내보내기
        </button>
      </div>

      {/* 분류 필터 */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:8}}>
        <Chip label="전체"   count={diffRows.length}            active={typeFilter === 'all'}              onClick={() => setTypeFilter('all')}/>
        <Chip label="전용"   count={typeCounts.exclusive}      active={typeFilter === 'exclusive'}        onClick={() => setTypeFilter('exclusive')}/>
        <Chip label="범용"   count={typeCounts.generic}        active={typeFilter === 'generic'}          onClick={() => setTypeFilter('generic')}/>
        <Chip label="범용관리" count={typeCounts['generic-managed']} active={typeFilter === 'generic-managed'} onClick={() => setTypeFilter('generic-managed')}/>
      </div>

      {/* 변동 상태 필터 */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
        <Chip label="전체"      count={counts.all}     active={filter === 'all'}     onClick={() => setFilter('all')}/>
        <Chip label="인상"      count={counts.up}      active={filter === 'up'}      onClick={() => setFilter('up')}      color="var(--negative)"/>
        <Chip label="인하"      count={counts.down}    active={filter === 'down'}    onClick={() => setFilter('down')}    color="var(--positive)"/>
        <Chip label="변동없음"  count={counts.same}    active={filter === 'same'}    onClick={() => setFilter('same')}/>
        <Chip label="신규"      count={counts.new}     active={filter === 'new'}     onClick={() => setFilter('new')}/>
        <Chip label="삭제"      count={counts.deleted} active={filter === 'deleted'} onClick={() => setFilter('deleted')}/>
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
                <SortableTh sortKey="basePrice"   active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>이전 단가</SortableTh>
                <SortableTh sortKey="latestPrice" active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>현재 단가</SortableTh>
                <SortableTh sortKey="changeAmount" active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>변동액</SortableTh>
                <SortableTh sortKey="changeRate"  active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>변동률</SortableTh>
                <th style={{width:90}}>상태</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => (
                <Row
                  key={`${row.productCode || row.productName}-${i}`}
                  row={row}
                  productTypeLookup={productTypeLookup}
                  onTypeChange={onTypeChange}
                />
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPage={goTo} total={total} pageSize={80} />
        </div>
      )}
    </div>
  );
}

function Row({ row, productTypeLookup, onTypeChange }) {
  const color =
    row.changeStatus === CHANGE_STATUS.UP   ? 'var(--negative)' :
    row.changeStatus === CHANGE_STATUS.DOWN ? 'var(--positive)' : undefined;

  return (
    <tr>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{row.productCode || '-'}</td>
      <td className="cell-name"><div className="menu-name" title={row.productName}>{row.productName}</div></td>
      <td>
        <TypeSelect
          productCode={row.productCode}
          productName={row.productName}
          productTypeLookup={productTypeLookup}
          onTypeChange={onTypeChange}
        />
      </td>
      <td className="num right">{row.basePrice != null ? `${formatNumber(row.basePrice)}원` : '—'}</td>
      <td className="num right" style={{fontWeight:700}}>
        {row.latestPrice != null ? `${formatNumber(row.latestPrice)}원` : '—'}
      </td>
      <td className="num right" style={{color, fontWeight:600}}>
        {row.changeAmount == null ? '—'
          : `${row.changeAmount >= 0 ? '+' : ''}${formatNumber(row.changeAmount)}원`}
      </td>
      <td className="num right" style={{color, fontWeight:700}}>
        {row.changeRate == null ? '—'
          : `${row.changeRate >= 0 ? '▲' : '▼'} ${Math.abs(row.changeRate * 100).toFixed(1)}%`}
      </td>
      <td><StatusChip status={row.changeStatus}/></td>
    </tr>
  );
}

function StatusChip({ status }) {
  const { bg, color } = CHANGE_STATUS_STYLE[status] || CHANGE_STATUS_STYLE._default;
  return <span className="chip" style={{background: bg, color}}>{status}</span>;
}
