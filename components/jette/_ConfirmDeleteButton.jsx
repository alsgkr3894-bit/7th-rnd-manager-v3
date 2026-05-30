'use client';
import { useState } from 'react';

/**
 * 2단계 삭제 확인 버튼 (삭제 → 삭제 확인 / 취소).
 * ShipmentHistory, PriceFileHistory 공용.
 *
 * @param {() => Promise<void>} onDelete - 삭제 실행 함수 (ID는 호출부에서 클로저로 제공)
 */
export function ConfirmDeleteButton({ onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try { await onDelete(); }
    finally { setBusy(false); setConfirming(false); }
  }

  if (confirming) {
    return (
      <span style={{display:'inline-flex', gap:6}}>
        <button className="btn sm" disabled={busy} onClick={() => setConfirming(false)}>취소</button>
        <button
          className="btn sm"
          disabled={busy}
          onClick={handleConfirm}
          style={{background:'var(--negative)', color:'#fff', borderColor:'var(--negative)'}}
        >
          {busy ? '삭제 중...' : '삭제 확인'}
        </button>
      </span>
    );
  }

  return (
    <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => setConfirming(true)}>
      삭제
    </button>
  );
}
