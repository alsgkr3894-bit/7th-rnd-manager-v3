'use client';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/Toast';
import { logoutAllSessions } from '@/lib/auth';
import { confirmUnsavedLeave } from '@/lib/ui/unsaved-changes';

/** 로그인을 남겨 둔 브라우저·PC를 한 번에 해제한다 (잃어버린 기기, 공용 PC 대비) */
export function LogoutAllButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setConfirming(false);
    if (!confirmUnsavedLeave()) return;
    setBusy(true);
    try {
      await logoutAllSessions();
      window.location.href = '/login';
    } catch (error) {
      showToast(error?.message || '로그인을 해제하지 못했습니다.', 'error');
      setBusy(false);
    }
  }

  return (
    <div
      style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <button className="btn sm" onClick={() => setConfirming(true)} disabled={busy}>
        {busy ? '해제 중…' : '모든 로그인 해제'}
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
        이 브라우저를 포함해 로그인해 둔 모든 곳에서 다시 로그인해야 합니다.
      </span>
      {confirming && (
        <ConfirmDialog
          open
          message="이 브라우저를 포함한 모든 로그인을 해제합니다. 계속할까요?"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
