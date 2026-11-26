'use client';
import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { fetchAppJson } from '@/lib/session';

const NOT_CHECKED = { error: '', at: null };
const messageOf = (err, fallback) => (err instanceof Error ? err.message : fallback);

/** 조회 한 건의 결과 반영 — 실패하면 이전 값과 마지막 성공 시각을 남긴다 */
function applyCheck(result, setData, setCheck) {
  if (result.status === 'fulfilled') {
    setData(result.value);
    setCheck({ error: '', at: new Date().toISOString() });
    return;
  }
  const error = messageOf(result.reason, '서버 상태를 확인할 수 없습니다.');
  setCheck(previous => ({ error, at: previous.at }));
}

export function useServerBackupStatus() {
  const [dbStatus, setDbStatus] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [dbCheck, setDbCheck] = useState(NOT_CHECKED);
  const [backupCheck, setBackupCheck] = useState(NOT_CHECKED);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // DB 상태와 백업 목록은 서로 독립이다 — 한쪽이 실패해도 다른 쪽은 반영한다
  const refresh = useCallback(async () => {
    setLoading(true);
    setCreateError('');
    const [db, backups] = await Promise.allSettled([
      fetchAppJson('/api/db/health'),
      fetchAppJson('/api/db/backups'),
    ]);
    applyCheck(db, setDbStatus, setDbCheck);
    applyCheck(backups, setBackupStatus, setBackupCheck);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createManualBackup = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const result = await fetchAppJson('/api/db/backups', {
        method: 'POST',
      });
      if (result.status) {
        setBackupStatus(result.status);
        setBackupCheck({ error: '', at: new Date().toISOString() });
      }
      showToast('서버 DB 백업을 생성했습니다.', 'ok');
    } catch (err) {
      const message = messageOf(err, '서버 DB 백업 생성에 실패했습니다.');
      setCreateError(message);
      showToast(`서버 DB 백업 실패: ${message}`, 'error');
    } finally {
      setCreating(false);
    }
  }, [creating]);

  return {
    dbStatus,
    backupStatus,
    dbCheck,
    backupCheck,
    loading,
    creating,
    createError,
    refresh,
    createManualBackup,
  };
}
