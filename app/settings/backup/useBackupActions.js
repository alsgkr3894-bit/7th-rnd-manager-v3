'use client';
import { useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { logBackupCreate } from '@/lib/change-log';
import { exportSelected } from '@/lib/db';
import { downloadBackup, makeFileName } from '@/lib/download';
import { addEntry } from '@/lib/backup-history';
import { backupFileStamp } from '@/lib/backup/file-check';

/**
 * 백업 실행 훅.
 * handleBackup 핸들러와 타이머 cleanup을 관리한다.
 */
export function useBackupActions({
  busy,
  setBusy,
  selectedKeys,
  selectedStores,
  selectedRows,
  setBackupProgress,
  backupProgressTimerRef,
  onRecorded,
}) {
  useEffect(
    () => () => {
      if (backupProgressTimerRef.current) clearTimeout(backupProgressTimerRef.current);
    },
    [backupProgressTimerRef]
  );

  async function handleBackup() {
    if (busy || selectedKeys.length === 0) return;
    setBusy(true);
    setBackupProgress({
      label: '백업 준비 중',
      current: 0,
      total: Math.max(selectedStores.length, 1),
    });
    try {
      const data = await exportSelected(
        selectedStores,
        { scopes: selectedKeys },
        {
          onProgress: ({ store, index, total }) => {
            setBackupProgress({ label: `${store} 내보내는 중`, current: index, total });
          },
        }
      );
      const fileName = makeFileName('7번가시스템백업', 'gz');
      setBackupProgress({
        label: '파일 다운로드 준비 중',
        current: Math.max(selectedStores.length, 1),
        total: Math.max(selectedStores.length, 1),
      });
      await downloadBackup(data, fileName);
      const recorded = addEntry({
        scopes: selectedKeys,
        totalRows: selectedRows,
        fileName,
        ...backupFileStamp(data),
      });
      onRecorded?.();
      logBackupCreate(fileName);
      showToast(
        `다운로드를 요청했어요 — ${fileName}. 저장한 뒤 [저장한 파일 확인]을 눌러 주세요.`,
        'ok',
        8000
      );
      if (!recorded) {
        showToast(
          '백업 이력 저장에 실패했어요 (저장 공간 부족). 다운로드한 파일은 직접 확인해 주세요.',
          'warn'
        );
      }
    } catch (err) {
      console.error('[Backup] 실패');
      showToast('백업 중 오류가 발생했습니다.', 'error');
    } finally {
      setBusy(false);
      if (backupProgressTimerRef.current) clearTimeout(backupProgressTimerRef.current);
      backupProgressTimerRef.current = setTimeout(() => {
        setBackupProgress(null);
        backupProgressTimerRef.current = null;
      }, 900);
    }
  }

  return { handleBackup };
}
