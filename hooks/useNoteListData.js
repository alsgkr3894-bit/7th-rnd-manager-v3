'use client';
import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllNotes } from '@/lib/note';
import { filterNoteListNotes } from '@/lib/note/filter';
import { buildUnifiedNoteRecords } from '@/lib/note/unified-records';
import { getAllSamples } from '@/lib/sample';
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
    const [noteData, sampleData, nextStats] = await Promise.all([
      getAllNotes(),
      getAllSamples(),
      getNoteDetailStats(),
    ]);
    if (!mountedRef.current) return;
    setNotes(buildUnifiedNoteRecords(filterNoteListNotes(noteData), sampleData));
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
