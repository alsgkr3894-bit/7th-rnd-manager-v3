'use client';
import { useState } from 'react';

/**
 * BatchToolbar — 식자재 관리 벌크 모드 툴바.
 * PageHeader actions 영역에 렌더.
 */
export function IngredientBatchToolbar({
  selected,
  mainCats = [],
  onDelete,
  onBulkDiscontinue,
  onBulkSetCategory,
  onExit,
}) {
  const selectedCount = selected instanceof Set ? selected.size : 0;
  const [showCatPicker, setShowCatPicker] = useState(false);
  // confirm 상태: null | { type: 'delete' } | { type: 'discontinue', discontinued: boolean } | { type: 'category', newCategory: string }
  const [confirm, setConfirm] = useState(null);

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.type === 'delete') {
      onDelete();
    } else if (confirm.type === 'discontinue') {
      onBulkDiscontinue(confirm.discontinued);
    } else if (confirm.type === 'category') {
      onBulkSetCategory(confirm.newCategory);
    }
    setConfirm(null);
  }

  // confirm 모드일 때는 확인/취소만 표시
  if (confirm) {
    const msg =
      confirm.type === 'delete'
        ? `${selectedCount}개를 삭제할까요? 삭제 후 토스트에서 실행취소할 수 있습니다.`
        : confirm.type === 'discontinue'
          ? `${selectedCount}개를 ${confirm.discontinued ? '단종' : '단종 복구'} 처리할까요?`
          : `${selectedCount}개의 분류를 '${confirm.newCategory || '(없음)'}' 으로 변경할까요?`;
    const isDelete = confirm.type === 'delete';
    return (
      <>
        <span style={{ fontSize: 12, color: 'var(--text-2)', marginRight: 4 }}>{msg}</span>
        <button
          className="btn sm"
          style={{
            background: isDelete ? 'var(--negative)' : 'var(--primary)',
            color: '#fff',
            border: 0,
          }}
          onClick={handleConfirm}
          disabled={selectedCount === 0}
        >
          {isDelete ? '삭제' : '확인'}
        </button>
        <button className="btn sm" onClick={() => setConfirm(null)}>
          취소
        </button>
      </>
    );
  }

  return (
    <>
      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginRight: 4 }}>
        {selectedCount}개 선택됨
      </span>

      {/* 단종 토글 */}
      {typeof onBulkDiscontinue === 'function' && (
        <>
          <button
            className="btn sm"
            disabled={selectedCount === 0}
            onClick={() => setConfirm({ type: 'discontinue', discontinued: true })}
            title="선택 항목을 단종 처리"
          >
            단종
          </button>
          <button
            className="btn sm"
            disabled={selectedCount === 0}
            onClick={() => setConfirm({ type: 'discontinue', discontinued: false })}
            title="선택 항목 단종 복구"
          >
            단종 복구
          </button>
        </>
      )}

      {/* 분류 일괄 변경 */}
      {typeof onBulkSetCategory === 'function' && mainCats.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button
            className="btn sm"
            disabled={selectedCount === 0}
            onClick={() => setShowCatPicker(v => !v)}
          >
            분류 변경 ▾
          </button>
          {showCatPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 200,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: 4,
                minWidth: 120,
                boxShadow: '0 4px 12px rgba(0,0,0,.12)',
              }}
            >
              <button
                className="btn sm ghost"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  color: 'var(--text-3)',
                  fontStyle: 'italic',
                }}
                onClick={() => {
                  setShowCatPicker(false);
                  setConfirm({ type: 'category', newCategory: '' });
                }}
              >
                (분류 없음)
              </button>
              {mainCats.map(cat => (
                <button
                  key={cat}
                  className="btn sm ghost"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => {
                    setShowCatPicker(false);
                    setConfirm({ type: 'category', newCategory: cat });
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        className="btn sm"
        style={{ color: 'var(--negative)' }}
        onClick={typeof onDelete === 'function' ? () => setConfirm({ type: 'delete' }) : undefined}
        disabled={selectedCount === 0}
      >
        선택 삭제 {selectedCount > 0 && `(${selectedCount})`}
      </button>
      <button className="btn sm" onClick={typeof onExit === 'function' ? onExit : undefined}>
        취소
      </button>
    </>
  );
}
