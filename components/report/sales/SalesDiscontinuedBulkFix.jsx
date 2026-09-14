'use client';

/**
 * 순위표에 메뉴마스터 기준 "단종" 배지가 여러 개 잘못 붙어 있을 때, 행마다 하나씩
 * 해제 버튼을 누르지 않고 한 번에 되돌리는 안내 바. count가 0이거나 canEdit이
 * 아니면 아무것도 렌더하지 않는다.
 */
export function SalesDiscontinuedBulkFix({ count, canEdit, onUndiscontinueAll }) {
  if (!canEdit || !count || typeof onUndiscontinueAll !== 'function') return null;
  return (
    <div
      className="card no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        marginBottom: 12,
        background: 'var(--surface-2)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
        메뉴마스터 기준 &ldquo;단종&rdquo; 표시가 {count}건 있습니다 — 실제로 단종이 아니라면 한
        번에 해제할 수 있어요.
      </span>
      <button
        type="button"
        className="btn sm"
        onClick={onUndiscontinueAll}
        style={{ marginLeft: 'auto' }}
      >
        전체 단종 해제
      </button>
    </div>
  );
}
