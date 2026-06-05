'use client';

/**
 * InlineConfirmButtons — 테이블 행 안에서 쓰는 작은 확인 UI.
 * 파괴적 액션을 alert/confirm 없이 같은 행에서 확정하게 한다.
 */
export function InlineConfirmButtons({
  message = '삭제할까요?',
  confirmLabel = '삭제',
  cancelLabel = '취소',
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--negative)', fontWeight: 700 }}>
        {message}
      </span>
      <button className="btn sm" onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </button>
      <button className="btn sm" onClick={onConfirm} disabled={busy} style={{ color: 'var(--negative)' }}>
        {busy ? '처리 중…' : confirmLabel}
      </button>
    </span>
  );
}
