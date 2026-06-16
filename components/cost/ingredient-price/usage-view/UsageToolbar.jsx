'use client';

import { printUsageReport } from '@/lib/cost/usage-print';
import { USAGE_CATS } from './usageViewUtils';

export function UsageToolbar({
  usageCat,
  usageSort,
  sortedRows,
  onUsageCat,
  onUsageSort,
  onExpandAll,
  onCollapseAll,
}) {
  return (
    <div
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {USAGE_CATS.map(cat => (
          <button
            key={cat}
            className={'chip' + (usageCat === cat ? ' active' : '')}
            onClick={() => onUsageCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="btn sm" onClick={onExpandAll}>
          모두 펼치기
        </button>
        <button className="btn sm" onClick={onCollapseAll}>
          모두 접기
        </button>
        <button className="btn sm" onClick={() => printUsageReport(sortedRows, usageCat)}>
          PDF 출력
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 4 }}>
          정렬
        </span>
        <select
          value={usageSort}
          onChange={event => onUsageSort(event.target.value)}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            cursor: 'pointer',
          }}
        >
          <option value="count_desc">많이 쓰는 순</option>
          <option value="count_asc">적게 쓰는 순</option>
          <option value="name_asc">이름 순</option>
        </select>
      </div>
    </div>
  );
}
