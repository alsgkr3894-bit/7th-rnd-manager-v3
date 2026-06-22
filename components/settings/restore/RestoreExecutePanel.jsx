'use client';
import { RestoreAutoBackupOption } from './RestoreAutoBackupOption';
import { RestoreBackupFailurePrompt } from './RestoreBackupFailurePrompt';
import { RestoreConfirmSummary } from './RestoreConfirmSummary';
import { RestoreExecuteActions } from './RestoreExecuteActions';
import { RestoreProgressBar } from './RestoreProgressBar';

/**
 * 복원 실행 섹션 (섹션 5): 자동백업 토글·확인 요약·진행률.
 *
 * @param {{
 *   busy: boolean,
 *   confirming: boolean,
 *   setConfirming: (v: boolean) => void,
 *   autoBackup: boolean,
 *   setAutoBackup: (fn: (v: boolean) => boolean) => void,
 *   backupFailed: boolean,
 *   setBackupFailed: (v: boolean) => void,
 *   restoreProgress: { label: string, current: number, total: number } | null,
 *   selectedKeys: string[],
 *   selectedRestoreStoreCount: number,
 *   ready: boolean,
 *   canRestore: boolean,
 *   handleRestore: (skipBackupCheck: boolean) => Promise<void>,
 *   impact: object | null,
 *   dangerRows: object[],
 *   wipeRows: object[],
 *   failedStoreCount: number,
 *   allowFailedStoreRestore: boolean,
 *   setAllowFailedStoreRestore: (v: boolean) => void,
 * }} props
 */
export function RestoreExecutePanel({
  busy,
  confirming,
  setConfirming,
  autoBackup,
  setAutoBackup,
  backupFailed,
  setBackupFailed,
  restoreProgress,
  selectedKeys,
  selectedRestoreStoreCount,
  ready,
  canRestore = false,
  handleRestore,
  impact,
  dangerRows,
  wipeRows,
  failedStoreCount = 0,
  allowFailedStoreRestore = false,
  setAllowFailedStoreRestore,
}) {
  const hasFailedStores = failedStoreCount > 0;
  const restoreBlockedByFailedStores = hasFailedStores && !allowFailedStoreRestore;
  const cancelBackupFailure = () => {
    setBackupFailed(false);
    setConfirming(false);
  };
  const restoreWithoutBackup = () => {
    setBackupFailed(false);
    handleRestore(true);
  };

  return (
    <div className="card" style={{ marginTop: 16, background: 'var(--negative-soft)' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>5. 복원 실행</h2>

      <RestoreAutoBackupOption autoBackup={autoBackup} onToggle={() => setAutoBackup(v => !v)} />

      {confirming && (
        <RestoreConfirmSummary
          selectedKeys={selectedKeys}
          impact={impact}
          dangerRows={dangerRows}
          wipeRows={wipeRows}
          autoBackup={autoBackup}
          busy={busy}
          failedStoreCount={failedStoreCount}
          allowFailedStoreRestore={allowFailedStoreRestore}
          setAllowFailedStoreRestore={setAllowFailedStoreRestore}
        />
      )}

      {backupFailed && (
        <RestoreBackupFailurePrompt
          onCancel={cancelBackupFailure}
          onRestoreWithoutBackup={restoreWithoutBackup}
        />
      )}

      <RestoreExecuteActions
        busy={busy}
        confirming={confirming}
        selectedKeys={selectedKeys}
        selectedRestoreStoreCount={selectedRestoreStoreCount}
        ready={ready}
        canRestore={canRestore}
        restoreBlockedByFailedStores={restoreBlockedByFailedStores}
        onStartConfirm={() => setConfirming(true)}
        onCancelConfirm={() => setConfirming(false)}
        onRestore={() => handleRestore(false)}
      />

      {busy && <RestoreProgressBar progress={restoreProgress} />}
    </div>
  );
}
