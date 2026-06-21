'use client';
import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllNotesCached } from '@/lib/note';
import { getNoteDetailStats } from '@/lib/stats/note-stats';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';

export function useNoteListData() {
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useMounted();

  const load = useCallback(async () => {
    await initDB();
    const [data, nextStats] = await Promise.all([getAllNotesCached(), getNoteDetailStats()]);
    if (!mountedRef.current) return;
    setNotes(data);
    setStats(nextStats);
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error('[useNoteListData] load', err);
        showToast('노트 목록을 불러오지 못했어요', 'error');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);

  useVisibilityRefresh(load);

  return {
    notes,
    setNotes,
    stats,
    loading,
    load,
  };
}
