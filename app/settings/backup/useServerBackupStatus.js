'use client';
import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { fetchAppJson } from '@/lib/session';

export function useServerBackupStatus() {
  const [dbStatus, setDbStatus] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [db, backups] = await Promise.all([
        fetchAppJson('/api/db/health'),
        fetchAppJson('/api/db/backups'),
      ]);
      setDbStatus(db);
      setBackupStatus(backups);
    } catch (err) {
      const message = err instanceof Error ? err.message : '서버 상태를 확인할 수 없습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createManualBackup = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const result = await fetchAppJson('/api/db/backups', {
        method: 'POST',
      });
      setBackupStatus(result.status || null);
      showToast('서버 DB 백업을 생성했습니다.', 'ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : '서버 DB 백업 생성에 실패했습니다.';
      setError(message);
      showToast(`서버 DB 백업 실패: ${message}`, 'error');
    } finally {
      setCreating(false);
    }
  }, [creating]);

  return {
    dbStatus,
    backupStatus,
    loading,
    creating,
    error,
    refresh,
    createManualBackup,
  };
}
