'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
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
                <Th sortKey="productCode" active={sortKey} dir={sortDir} onClick={toggleSort} width={100}>제품코드</Th>
                <Th sortKey="productName" active={sortKey} dir={sortDir} onClick={toggleSort}>제품명</Th>
                <Th sortKey="basePrice"   active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>이전 단가</Th>
                <Th sortKey="latestPrice" active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>현재 단가</Th>
                <Th sortKey="changeAmount" active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>변동액</Th>
                <Th sortKey="changeRate"  active={sortKey} dir={sortDir} onClick={toggleSort} width={120} right>변동률</Th>
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

function Th({ sortKey, active, dir, onClick, children, width, right }) {
  const isActive = active === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className="sortable"
      style={{ width, textAlign: right ? 'right' : undefined, cursor: 'pointer', userSelect: 'none' }}
    >
      {children}{' '}
      <span style={{color: isActive ? 'var(--accent)' : 'var(--text-4)', fontSize: 10}}>
        {isActive ? (dir === 'asc' ? '▲' : '▼') : '▾'}
      </span>
    </th>
  );
}

function Chip({ label, count, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="chip"
      style={{
        cursor:'pointer', border:'none',
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? '#fff' : (color || 'var(--text-2)'),
        fontWeight: 600,
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-3)',
        padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
      }}>{count}</span>
    </button>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div style={{position:'relative', marginBottom:12}}>
      <Icon.search style={{
        width:14, height:14, position:'absolute', top:'50%', left:12,
        transform:'translateY(-50%)', color:'var(--text-4)',
      }}/>
      <input
        placeholder="제품명·제품코드 검색"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width:'100%', padding:'8px 12px 8px 32px', borderRadius:8,
          border:'1px solid var(--border)', background:'var(--surface-2)',
          color:'var(--text-1)', fontSize:13,
        }}
      />
    </div>
  );
}
