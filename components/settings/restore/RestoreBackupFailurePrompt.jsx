export function RestoreBackupFailurePrompt({ onCancel, onRestoreWithoutBackup }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        marginBottom: 12,
        borderRadius: 8,
        background: 'var(--warn-soft)',
        border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warn)', marginBottom: 6 }}>
        ⚠ 자동 백업에 실패했습니다
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 10 }}>
        복원 실패 시 되돌릴 수 없습니다. 백업 없이 복원을 계속 진행할까요?
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>
          취소
        </button>
        <button
          className="btn"
          onClick={onRestoreWithoutBackup}
          style={{
            background: 'var(--negative)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
          }}
        >
          백업 없이 복원
        </button>
      </div>
    </div>
  );
}
