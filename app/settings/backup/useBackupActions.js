'use client';
import { useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { exportSelected } from '@/lib/db';
import { downloadJson, makeFileName } from '@/lib/download';
import { getHistory, addEntry, getLastBackupAt } from '@/lib/backup-history';

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
  setHistory,
  setLastBackupAt,
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
      const fileName = makeFileName('7번가시스템백업', 'json');
      setBackupProgress({
        label: '파일 다운로드 준비 중',
        current: Math.max(selectedStores.length, 1),
        total: Math.max(selectedStores.length, 1),
      });
      downloadJson(data, fileName);
      const recorded = addEntry({
        scopes: selectedKeys,
        totalRows: selectedRows,
        fileName,
      });
      setHistory(getHistory());
      setLastBackupAt(getLastBackupAt());
      showToast(`백업 완료 — ${fileName}`, 'ok');
      if (!recorded) {
        showToast(
          '백업 이력 저장에 실패했어요 (저장 공간 부족). 백업 파일은 정상 다운로드되었습니다.',
          'warn'
        );
      }
    } catch (err) {
      console.error('[Backup] 실패:', err);
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
