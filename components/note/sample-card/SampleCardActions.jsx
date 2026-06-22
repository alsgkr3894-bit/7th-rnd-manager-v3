export function SampleCardActions({ onEdit, onCopy, onDelete, canEdit = false }) {
  return (
    <div
      style={{ display: 'flex', gap: 6, marginTop: 4 }}
      onClick={event => event.stopPropagation()}
    >
      <button className="btn sm" style={{ flex: 1 }} onClick={onEdit} disabled={!canEdit}>
        수정
      </button>
      <button className="btn sm" onClick={onCopy} disabled={!canEdit}>
        복사
      </button>
      <button
        className="btn sm"
        style={{ color: 'var(--negative)' }}
        onClick={onDelete}
        disabled={!canEdit}
      >
        삭제
      </button>
    </div>
  );
}
