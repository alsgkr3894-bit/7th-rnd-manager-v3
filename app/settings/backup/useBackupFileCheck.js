'use client';
import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { checkBackupFile } from '@/lib/backup/file-check';
import { getHistory, markFileChecked } from '@/lib/backup-history';
import { backupFileError, readBackupFile } from '@/lib/backup/read-file';

/** 저장한 백업 파일을 다시 골라 읽기 확인 — 통과한 경우에만 파일 확인 시각을 남긴다 */
export function useBackupFileCheck({ onChecked }) {
  const [checking, setChecking] = useState(false);

  async function handleCheckFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const invalid = backupFileError(file);
    if (invalid) {
      showToast(invalid, 'error');
      input.value = '';
      return;
    }
    setChecking(true);
    try {
      const result = checkBackupFile(await readBackupFile(file), getHistory());
      if (!result.ok) {
        showToast(result.reason, 'warn', 8000);
        return;
      }
      if (!markFileChecked(result.entry.id)) {
        showToast('파일은 읽었지만 확인 기록을 저장하지 못했어요 (저장 공간 확인)', 'warn', 8000);
        return;
      }
      onChecked?.();
      showToast(`백업 파일 확인 완료 — ${file.name}`, 'ok');
    } catch (err) {
      console.error('[Backup] 파일 확인 실패');
      showToast(`백업 파일을 읽을 수 없습니다: ${err?.message || err}`, 'error', 8000);
    } finally {
      setChecking(false);
      // 같은 파일을 다시 고를 수 있게 비운다
      input.value = '';
    }
  }

  return { checking, handleCheckFile };
}
