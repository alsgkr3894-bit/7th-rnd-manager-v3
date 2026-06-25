'use client';
import { Fragment } from 'react';
import { SortableTh } from '@/components/ui/SortableTh';

export function MarginTableHeader({
  sizeLabels,
  sortKey,
  sortDir,
  onSort,
  hasAdjustment,
  viewMode,
}) {
  return (
    <>
      {/* 1행: 사이즈 그룹 헤더 — 사이즈마다 원가·판매가·(할인)·율을 한 묶음으로 */}
      <tr className="mt-group">
        <SortableTh
          sortKey="name"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={160}
          rowSpan={2}
          className="sticky-col"
        >
          메뉴명
        </SortableTh>
        <SortableTh
          sortKey="cat"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={90}
          rowSpan={2}
        >
          카테고리
        </SortableTh>
        <SortableTh
          sortKey="sub"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={132}
          rowSpan={2}
        >
          중분류
        </SortableTh>
        {sizeLabels.map(l => (
          <th
            key={l + '_grp'}
            colSpan={hasAdjustment ? 4 : 3}
            style={{ textAlign: 'center', borderLeft: '2px solid var(--divider)' }}
          >
            <span className="chip" style={{ fontSize: 11 }}>
              {l}
            </span>
          </th>
        ))}
        <th rowSpan={2} style={{ width: 60 }} />
      </tr>
      {/* 2행: 메트릭 헤더 (정렬) */}
      <tr className="mt-metric">
        {sizeLabels.map(l => (
          <Fragment key={l + '_mh'}>
            <SortableTh
              sortKey={`cost_${l}`}
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={92}
              right
              style={{ borderLeft: '2px solid var(--divider)' }}
            >
              원가
            </SortableTh>
            <SortableTh
              sortKey={`price_${l}`}
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={96}
              right
            >
              판매가
            </SortableTh>
            {hasAdjustment && (
              <SortableTh
                sortKey={`net_${l}`}
                active={sortKey}
                dir={sortDir}
                onClick={onSort}
                width={110}
                right
              >
                <span style={{ color: 'var(--accent)' }}>할인적용</span>
              </SortableTh>
            )}
            <SortableTh
              sortKey={`rate_${l}`}
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={92}
              right
            >
              {viewMode === 'margin' ? '마진율' : '원가율'}
            </SortableTh>
          </Fragment>
        ))}
      </tr>
    </>
  );
}
