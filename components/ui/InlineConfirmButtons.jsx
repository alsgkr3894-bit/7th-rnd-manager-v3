'use client';
import { asDisplayText } from '@/lib/ui/prop-guards';

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
  const safeMessage = asDisplayText(message, '삭제할까요?');
  const safeConfirmLabel = asDisplayText(confirmLabel, '삭제');
  const safeCancelLabel = asDisplayText(cancelLabel, '취소');
  const handleConfirm = typeof onConfirm === 'function' ? onConfirm : undefined;
  const handleCancel = typeof onCancel === 'function' ? onCancel : undefined;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--negative)', fontWeight: 700 }}>
        {safeMessage}
      </span>
      <button className="btn sm" onClick={handleCancel} disabled={busy}>
        {safeCancelLabel}
      </button>
      <button className="btn sm" onClick={handleConfirm} disabled={busy} style={{ color: 'var(--negative)' }}>
        {busy ? '처리 중…' : safeConfirmLabel}
      </button>
    </span>
  );
}
