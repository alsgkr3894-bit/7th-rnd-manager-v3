'use client';
import { useEffect, useState } from 'react';
import {
  RESTORE_JOURNAL_EVENT,
  RESTORE_JOURNAL_KEY,
  readRestoreJournal,
  restoreAttentionOf,
} from '@/lib/backup/restore-journal';

/** 확인이 필요한 마지막 복원 상태 — 앱을 열 때와 일지가 바뀔 때(다른 탭 포함) 다시 읽는다 */
export function useRestoreAttention() {
  const [attention, setAttention] = useState(null);

  useEffect(() => {
    const read = () => setAttention(restoreAttentionOf(readRestoreJournal()));
    const onStorage = event => {
      if (event.key === RESTORE_JOURNAL_KEY) read();
    };
    read();
    window.addEventListener(RESTORE_JOURNAL_EVENT, read);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RESTORE_JOURNAL_EVENT, read);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return attention;
}
