'use client';
import { useMemo, useState } from 'react';
import { SortableTh } from '@/components/ui/SortableTh';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const PAGE_SIZE = 50;

function compareValues(a, b, dir) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // 양쪽이 모두 유효 숫자일 때만 숫자 비교. 한쪽이 문자열 표기("미정","-")면
  // 0으로 강제돼 실수치 사이에 끼던 문제를 막기 위해 문자열 비교로 폴백한다.
  const na = Number(a);
  const nb = Number(b);
  if (a !== '' && b !== '' && Number.isFinite(na) && Number.isFinite(nb)) {
    return na > nb ? dir : na < nb ? -dir : 0;
  }

  return asDisplayText(a).localeCompare(asDisplayText(b), 'ko') * dir;
}

/**
 * CompareTable — 메뉴별 상세 비교 테이블 (정렬 가능 + 신규/단종 chip)
 *
 * @param {Array} rows — buildPeriodCompare().rows
 */
export function CompareTable({ rows }) {
  const [sortKey, setSortKey] = useState('a');
  const [sortDir, setSortDir] = useState('desc');
  const safeRows = useMemo(() => asObjectArray(rows), [rows]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...safeRows].sort((a, b) => {
      const va = a[sortKey],
        vb = b[sortKey];
      return compareValues(va, vb, dir);
    });
  }, [safeRows, sortKey, sortDir]);

  const { page, goTo, totalPages, paged, total } = usePagination(sorted, PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="card table-card" style={{ marginTop: 16 }}>
      <div style={{ padding: '20px 22px 12px' }}>
        <div className="card-title">메뉴별 상세 비교</div>
        <div className="card-sub">컬럼 헤더로 정렬 · 신규/단종 메뉴 포함</div>
      </div>
      {sorted.length === 0 ? (
        <div
          style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
        >
          비교 데이터가 없습니다
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>순위</th>
                <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={toggleSort}>
                  메뉴명
                </SortableTh>
                <SortableTh
                  sortKey="category"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={120}
                >
                  카테고리
                </SortableTh>
                <SortableTh
                  sortKey="a"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={140}
                  right
                >
                  기준 (A)
                </SortableTh>
                <SortableTh
                  sortKey="b"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={140}
                  right
                >
                  비교 (B)
                </SortableTh>
                <SortableTh
                  sortKey="diff"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={130}
                  right
                >
                  증감
                </SortableTh>
                <SortableTh
                  sortKey="pct"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={130}
                  right
                >
                  증감률
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <Row
                  key={`${asDisplayText(r.name, 'menu')}-${startIndex + i}`}
                  r={r}
                  rank={startIndex + i + 1}
                />
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '1px solid var(--divider)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={goTo}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ r, rank }) {
  const row = r && typeof r === 'object' ? r : {};
  const name = asDisplayText(row.name, '-');
  const category = asDisplayText(row.category, '-');
  const a = asFiniteNumber(row.a, 0);
  const b = asFiniteNumber(row.b, 0);
  const diff = asFiniteNumber(row.diff, 0);
  const pct = row.pct == null || !Number.isFinite(Number(row.pct)) ? null : Number(row.pct);
  const aIsZero = Boolean(row.aIsZero);
  const bIsZero = Boolean(row.bIsZero);
  const isNew = bIsZero && !aIsZero;
  const isDropped = aIsZero && !bIsZero;

  return (
    <tr>
      <td className="num" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
        {rank}
      </td>
      <td className="cell-name">
        <span className="menu-name">{name}</span>
        {isNew && (
          <span
            className="chip"
            style={{ background: 'var(--positive-soft)', color: 'var(--positive)', marginLeft: 6 }}
          >
            신규
          </span>
        )}
        {isDropped && (
          <span
            className="chip"
            style={{ background: 'var(--negative-soft)', color: 'var(--negative)', marginLeft: 6 }}
          >
            단종
          </span>
        )}
      </td>
      <td>
        <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          {category}
        </span>
      </td>
      <td className="num right">
        {a > 0 ? formatNumber(a) : '—'}
        {a > 0 && <span className="unit">개</span>}
      </td>
      <td className="num right">
        {b > 0 ? formatNumber(b) : '—'}
        {b > 0 && <span className="unit">개</span>}
      </td>
      <td
        className="num right"
        style={{ color: diff >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 700 }}
      >
        {diff >= 0 ? '+' : ''}
        {formatNumber(diff)}
      </td>
      <td className="num right">
        {pct == null ? (
          <span
            className="chip"
            style={{ background: 'var(--positive-soft)', color: 'var(--positive)' }}
          >
            신규
          </span>
        ) : aIsZero ? (
          <span
            className="chip"
            style={{ background: 'var(--negative-soft)', color: 'var(--negative)' }}
          >
            단종
          </span>
        ) : (
          <span
            style={{ color: pct >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 700 }}
          >
            {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </td>
    </tr>
  );
}
