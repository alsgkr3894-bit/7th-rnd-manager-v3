'use client';
import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';

/**
 * CompareTable — 메뉴별 상세 비교 테이블 (정렬 가능 + 신규/단종 chip)
 *
 * @param {Array} rows — buildPeriodCompare().rows
 */
export function CompareTable({ rows }) {
  const [sortKey, setSortKey] = useState('a');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb, 'ko') * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  return (
    <div className="card table-card" style={{marginTop:16}}>
      <div style={{padding: '20px 22px 12px'}}>
        <div className="card-title">메뉴별 상세 비교</div>
        <div className="card-sub">컬럼 헤더로 정렬 · 신규/단종 메뉴 포함</div>
      </div>
      {sorted.length === 0 ? (
        <div style={{padding:'48px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          비교 데이터가 없습니다
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width:60}}>순위</th>
                <Th sortKey="name"     active={sortKey} dir={sortDir} onClick={toggleSort}>메뉴명</Th>
                <Th sortKey="category" active={sortKey} dir={sortDir} onClick={toggleSort} width={120}>카테고리</Th>
                <Th sortKey="a"        active={sortKey} dir={sortDir} onClick={toggleSort} width={140} right>기준 (A)</Th>
                <Th sortKey="b"        active={sortKey} dir={sortDir} onClick={toggleSort} width={140} right>비교 (B)</Th>
                <Th sortKey="diff"     active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>증감</Th>
                <Th sortKey="pct"      active={sortKey} dir={sortDir} onClick={toggleSort} width={130} right>증감률</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => <Row key={r.name} r={r} rank={i + 1}/>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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

function Row({ r, rank }) {
  const isNew = r.bIsZero && !r.aIsZero;
  const isDropped = r.aIsZero && !r.bIsZero;

  return (
    <tr>
      <td className="num" style={{color:'var(--text-2)', fontWeight:600}}>{rank}</td>
      <td className="cell-name">
        <span className="menu-name">{r.name}</span>
        {isNew     && <span className="chip" style={{background:'var(--positive-soft)', color:'var(--positive)', marginLeft:6}}>신규</span>}
        {isDropped && <span className="chip" style={{background:'var(--negative-soft)', color:'var(--negative)', marginLeft:6}}>단종</span>}
      </td>
      <td><span className="chip" style={{background:'var(--surface-2)', color:'var(--text-2)'}}>{r.category || '-'}</span></td>
      <td className="num right">{r.a > 0 ? formatNumber(r.a) : '—'}{r.a > 0 && <span className="unit">개</span>}</td>
      <td className="num right">{r.b > 0 ? formatNumber(r.b) : '—'}{r.b > 0 && <span className="unit">개</span>}</td>
      <td className="num right" style={{color: r.diff >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 700}}>
        {r.diff >= 0 ? '+' : ''}{formatNumber(r.diff)}
      </td>
      <td className="num right">
        {r.pct == null ? (
          <span className="chip" style={{background:'var(--positive-soft)', color:'var(--positive)'}}>신규</span>
        ) : r.aIsZero ? (
          <span className="chip" style={{background:'var(--negative-soft)', color:'var(--negative)'}}>단종</span>
        ) : (
          <span style={{color: r.pct >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 700}}>
            {r.pct >= 0 ? '▲' : '▼'} {Math.abs(r.pct).toFixed(1)}%
          </span>
        )}
      </td>
    </tr>
  );
}
