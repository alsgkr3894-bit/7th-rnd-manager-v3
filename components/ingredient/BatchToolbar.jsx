'use client';

/**
 * BatchToolbar — 식자재 관리 벌크 모드 툴바.
 * PageHeader actions 영역에 렌더.
 *
 * @param {{ selected: Set<number>, onDelete: ()=>void, onExit: ()=>void }} props
 */
export function IngredientBatchToolbar({ selected, onDelete, onExit }) {
  return (
    <>
      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginRight: 4 }}>
        {selected.size}개 선택됨
      </span>
      <button
        className="btn"
        style={{ color: 'var(--negative)' }}
        onClick={onDelete}
        disabled={selected.size === 0}
      >
        선택 삭제 {selected.size > 0 && `(${selected.size})`}
      </button>
      <button className="btn" onClick={onExit}>취소</button>
    </>
  );
}
