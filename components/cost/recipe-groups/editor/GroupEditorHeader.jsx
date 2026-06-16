'use client';

export function GroupEditorHeader({ draft, isNew, saving, onSave, onDelete, onCancel }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15 }}>
        {isNew ? '새 공통묶음 등록' : `${draft.name} 수정`}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {onDelete && (
          <button className="btn" style={{ color: 'var(--negative)' }} onClick={onDelete}>
            삭제
          </button>
        )}
        <button className="btn" onClick={onCancel}>
          취소
        </button>
        <button className="btn primary" onClick={onSave} disabled={saving}>
          {saving ? '저장 중…' : isNew ? '등록' : '수정'}
        </button>
      </div>
    </div>
  );
}
