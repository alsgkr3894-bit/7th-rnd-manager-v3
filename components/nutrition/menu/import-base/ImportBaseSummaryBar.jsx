'use client';

export function ImportBaseSummaryBar({
  rows,
  counts,
  included,
  allSelected,
  toggleableCount,
  hasSelectedToggleable,
  onSelectAll,
  onDeselectAll,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>총 {rows.length}행</span>
      {counts.matched ? (
        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
          매칭 {counts.matched}
        </span>
      ) : null}
      {counts.exists ? (
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
          이미저장 {counts.exists}
        </span>
      ) : null}
      {counts.dup ? (
        <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>중복 {counts.dup}</span>
      ) : null}
      {counts.unmatched ? (
        <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 700 }}>
          미매칭 {counts.unmatched}
        </span>
      ) : null}
      {counts.skipped ? (
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
          건너뜀 {counts.skipped}
        </span>
      ) : null}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          className="btn sm ghost"
          style={{ fontSize: 11 }}
          onClick={onSelectAll}
          disabled={allSelected || toggleableCount === 0}
        >
          전체선택
        </button>
        <button
          className="btn sm ghost"
          style={{ fontSize: 11 }}
          onClick={onDeselectAll}
          disabled={!hasSelectedToggleable}
        >
          전체해제
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>
          저장 대상: <strong style={{ color: 'var(--text-1)' }}>{included}건</strong>
        </span>
      </div>
    </div>
  );
}
