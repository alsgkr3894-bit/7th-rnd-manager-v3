export function RegisterModalActions({ saving, existing, onClose }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
      <button type="button" className="btn" onClick={onClose}>
        취소
      </button>
      <button type="submit" className="btn primary" disabled={saving}>
        {saving ? '저장 중…' : existing ? '수정' : '등록'}
      </button>
    </div>
  );
}
