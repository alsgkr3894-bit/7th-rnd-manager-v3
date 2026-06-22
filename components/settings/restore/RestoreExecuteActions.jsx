export function RestoreExecuteActions({
  busy,
  confirming,
  selectedKeys,
  selectedRestoreStoreCount,
  ready,
  canRestore = false,
  restoreBlockedByFailedStores,
  onStartConfirm,
  onCancelConfirm,
  onRestore,
}) {
  if (!confirming) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn"
          disabled={
            busy || !canRestore || selectedKeys.length === 0 || selectedRestoreStoreCount === 0
          }
          onClick={onStartConfirm}
          style={{ color: 'var(--negative)', borderColor: 'var(--negative)' }}
        >
          복원 실행
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <button className="btn" disabled={busy} onClick={onCancelConfirm}>
        취소
      </button>
      <button
        className="btn"
        disabled={
          busy ||
          !ready ||
          !canRestore ||
          selectedRestoreStoreCount === 0 ||
          restoreBlockedByFailedStores
        }
        onClick={onRestore}
        style={{
          background: 'var(--negative)',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
        }}
      >
        {busy ? (
          <>
            <span
              style={{
                display: 'inline-block',
                marginRight: 6,
                animation: 'spin 1s linear infinite',
              }}
            >
              ⟳
            </span>
            복원 중…
          </>
        ) : (
          `${selectedKeys.length}개 모듈 교체 복원`
        )}
      </button>
    </div>
  );
}
