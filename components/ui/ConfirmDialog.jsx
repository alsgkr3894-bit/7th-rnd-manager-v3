'use client';
import { useModalShell } from '@/hooks/useModalShell';

export function ConfirmDialog({ open, ...props }) {
  if (!open) return null;
  return <ConfirmDialogBody {...props} />;
}

function ConfirmDialogBody({ title, message, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel, danger = false }) {
  // 공통 모달 동작(포커스 트랩·복원·Esc·origin·exit). autoFocus:false → 확인 버튼의 네이티브 autoFocus 보존
  const { containerRef, isClosing, close } = useModalShell(onCancel, { autoFocus: false });
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:600, display:'grid', placeItems:'center', animation:'fade 150ms ease' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div ref={containerRef} className={'card modal-anim' + (isClosing ? ' modal-exit' : '')} style={{ width:'min(420px,92vw)', padding:'28px 28px 24px' }}>
        <div style={{ fontWeight:800, fontSize:16, color:'var(--text-1)', marginBottom:8 }}>{title}</div>
        {message && (
          <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.65, marginBottom:24 }}>{message}</div>
        )}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn" onClick={close}>{cancelLabel}</button>
          <button
            className="btn primary"
            style={danger ? { background:'var(--negative)', borderColor:'var(--negative)' } : {}}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
