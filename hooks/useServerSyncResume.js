'use client';
import { useEffect } from 'react';
import { flushServerStoreSyncQueue, resumeServerStoreSync } from '@/lib/db/server-sync';

/** 지난번에 서버가 확인하지 못한 변경을 앱을 열 때와 네트워크가 돌아올 때 다시 보낸다. */
export function useServerSyncResume() {
  useEffect(() => {
    const send = () => {
      resumeServerStoreSync()
        .then(flushServerStoreSyncQueue)
        .catch(error => console.warn('[DB sync] 재전송 실패:', error?.message));
    };
    send();
    window.addEventListener('online', send);
    return () => window.removeEventListener('online', send);
  }, []);
}
