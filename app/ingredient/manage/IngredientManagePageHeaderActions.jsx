'use client';
import { Icon } from '@/components/icons';
import { IngredientBatchToolbar } from '@/components/ingredient/BatchToolbar';

/**
 * PageHeader의 actions 영역: 일괄 선택 모드면 툴바, 아니면 초기화/선택/추가 버튼 묶음.
 */
export function IngredientManagePageHeaderActions({
  batchMode,
  selected,
  deletableSelectedCount,
  mainCats,
  selectableCount,
  allSelected,
  onToggleSelectAll,
  onBatchDelete,
  onBulkDiscontinue,
  onBulkSetCategory,
  onExitBatch,
  resetConfirm,
  onResetConfirmChange,
  rowsCount,
  resetting,
  onReset,
  isViewer,
  onStartBatch,
  onAddNew,
}) {
  if (batchMode) {
    return (
      <IngredientBatchToolbar
        selected={selected}
        deletableCount={deletableSelectedCount}
        mainCats={mainCats}
        selectableCount={selectableCount}
        allSelected={allSelected}
        onToggleSelectAll={onToggleSelectAll}
        onDelete={onBatchDelete}
        onBulkDiscontinue={onBulkDiscontinue}
        onBulkSetCategory={onBulkSetCategory}
        onExit={onExitBatch}
      />
    );
  }

  return (
    <>
      {resetConfirm ? (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
            모든 식자재 데이터({rowsCount}개)를 삭제할까요?
          </span>
          <button
            className="btn"
            style={{
              background: 'var(--negative)',
              color: 'var(--surface)',
              border: 'none',
            }}
            onClick={onReset}
            disabled={resetting || isViewer}
          >
            {resetting ? '삭제 중…' : '삭제'}
          </button>
          <button className="btn" onClick={() => onResetConfirmChange(false)}>
            취소
          </button>
        </span>
      ) : (
        <button
          className="btn"
          onClick={() => onResetConfirmChange(true)}
          style={{ color: 'var(--text-3)' }}
          disabled={rowsCount === 0 || isViewer}
        >
          <Icon.trash style={{ width: 14, height: 14 }} /> 데이터 초기화
        </button>
      )}
      <button className="btn" onClick={onStartBatch} disabled={rowsCount === 0 || isViewer}>
        선택
      </button>
      <button className="btn primary" onClick={onAddNew} disabled={isViewer}>
        <Icon.plus style={{ width: 14, height: 14 }} /> 식자재 추가
      </button>
    </>
  );
}
