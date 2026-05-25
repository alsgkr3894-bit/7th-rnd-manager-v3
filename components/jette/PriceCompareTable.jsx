'use client';
import { useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { formatNumber } from '@/lib/format';

/**
 * PriceCompareTable — 가격 비교 결과 테이블 (검색 + 상태 필터 + 정렬)
 *
 * @param {Array} diffRows — comparePriceLists 결과
 */
export function PriceCompareTable({ diffRows }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | up | down | same | new | deleted
  const [sortKey, setSortKey] = useState('changeRate');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let list = diffRows;
    if (filter !== 'all') {
      const map = { up: '인상', down: '인하', same: '변동없음', new: '신규', deleted: '삭제' };
      list = list.filter(r => r.changeStatus === map[filter]);
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
  }, [diffRows, search, filter, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const counts = useMemo(() => ({
    all:     diffRows.length,
    up:      diffRows.filter(r => r.changeStatus === '인상').length,
    down:    diffRows.filter(r => r.changeStatus === '인하').length,
    same:    diffRows.filter(r => r.changeStatus === '변동없음').length,
    new:     diffRows.filter(r => r.changeStatus === '신규').length,
    deleted: diffRows.filter(r => r.changeStatus === '삭제').length,
  }), [diffRows]);

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">가격 비교</div>
          <div className="card-sub">제품코드 우선 매칭 · 변동률 기준 정렬</div>
        </div>
      </div>

      {/* 필터 */}
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
                <SortableTh sortKey="basePrice"   active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>이전 단가</SortableTh>
                <SortableTh sortKey="latestPrice" active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>현재 단가</SortableTh>
                <SortableTh sortKey="changeAmount" active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>변동액</SortableTh>
                <SortableTh sortKey="changeRate"  active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>변동률</SortableTh>
                <th style={{width:90}}>상태</th>
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
  const color =
    r.changeStatus === '인상' ? 'var(--negative)' :
    r.changeStatus === '인하' ? 'var(--positive)' : undefined;
  return (
    <tr>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{r.productCode || '-'}</td>
      <td className="cell-name"><div className="menu-name">{r.productName}</div></td>
      <td className="num right">{r.basePrice != null ? `${formatNumber(r.basePrice)}원` : '—'}</td>
      <td className="num right" style={{fontWeight:700}}>
        {r.latestPrice != null ? `${formatNumber(r.latestPrice)}원` : '—'}
      </td>
      <td className="num right" style={{color, fontWeight:600}}>
        {r.changeAmount == null ? '—'
          : `${r.changeAmount >= 0 ? '+' : ''}${formatNumber(r.changeAmount)}원`}
      </td>
      <td className="num right" style={{color, fontWeight:700}}>
        {r.changeRate == null ? '—'
          : `${r.changeRate >= 0 ? '▲' : '▼'} ${Math.abs(r.changeRate * 100).toFixed(1)}%`}
      </td>
      <td><StatusChip status={r.changeStatus}/></td>
    </tr>
  );
}

function StatusChip({ status }) {
  const map = {
    '인상':     { bg: 'var(--negative-soft)', color: 'var(--negative)' },
    '인하':     { bg: 'var(--positive-soft)', color: 'var(--positive)' },
    '신규':     { bg: 'var(--accent-soft)',   color: 'var(--accent-text)' },
    '삭제':     { bg: 'var(--surface-2)',     color: 'var(--text-3)' },
    '변동없음': { bg: 'var(--surface-2)',     color: 'var(--text-2)' },
  };
  const { bg, color } = map[status] || map['변동없음'];
  return <span className="chip" style={{background: bg, color}}>{status}</span>;
}

