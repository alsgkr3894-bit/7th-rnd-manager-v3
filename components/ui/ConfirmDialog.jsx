'use client';
import { useRef } from 'react';
import { useModalOrigin } from '@/hooks/useModalOrigin';

export function ConfirmDialog({ open, ...props }) {
  if (!open) return null;
  return <ConfirmDialogBody {...props} />;
}

function ConfirmDialogBody({ title, message, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel, danger = false }) {
  const cardRef = useRef(null);
  // 클릭한 위치에서 펼쳐지도록 transform-origin 설정
  useModalOrigin(cardRef);
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:600, display:'grid', placeItems:'center', animation:'fade 150ms ease' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div ref={cardRef} className="card modal-anim" style={{ width:'min(420px,92vw)', padding:'28px 28px 24px' }}>
        <div style={{ fontWeight:800, fontSize:16, color:'var(--text-1)', marginBottom:8 }}>{title}</div>
        {message && (
          <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.65, marginBottom:24 }}>{message}</div>
        )}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
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
