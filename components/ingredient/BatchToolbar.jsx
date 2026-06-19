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
            onClick={() => onBulkDiscontinue(true)}
            title="선택 항목을 단종 처리"
          >
            단종
          </button>
          <button
            className="btn sm"
            disabled={selectedCount === 0}
            onClick={() => onBulkDiscontinue(false)}
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
                style={{ width: '100%', textAlign: 'left', color: 'var(--text-3)', fontStyle: 'italic' }}
                onClick={() => {
                  setShowCatPicker(false);
                  onBulkSetCategory('');
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
                    onBulkSetCategory(cat);
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
        onClick={typeof onDelete === 'function' ? onDelete : undefined}
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
