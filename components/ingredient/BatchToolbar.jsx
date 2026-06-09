'use client';

/**
 * BatchToolbar — 식자재 관리 벌크 모드 툴바.
 * PageHeader actions 영역에 렌더.
 *
 * @param {{ selected: Set<number>, onDelete: ()=>void, onExit: ()=>void }} props
 */
export function IngredientBatchToolbar({ selected, onDelete, onExit }) {
  const selectedCount = selected instanceof Set ? selected.size : 0;
  const handleDelete = typeof onDelete === 'function' ? onDelete : undefined;
  const handleExit = typeof onExit === 'function' ? onExit : undefined;

  return (
    <>
      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginRight: 4 }}>
        {selectedCount}개 선택됨
      </span>
      <button
        className="btn"
        style={{ color: 'var(--negative)' }}
        onClick={handleDelete}
        disabled={selectedCount === 0}
      >
        선택 삭제 {selectedCount > 0 && `(${selectedCount})`}
      </button>
      <button className="btn" onClick={handleExit}>취소</button>
    </>
  );
}
