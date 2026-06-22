'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { getAllNotesCached } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { getAllSchedules } from '@/lib/note/schedules';
import { getAllWorkLogs, pruneOldWorkLogs, WORK_LOG_RETENTION_DAYS } from '@/lib/work-log';
import { useMounted } from '@/hooks/useMounted';

export function useCalendarData({ canEdit = false } = {}) {
  const [notes, setNotes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useMounted();
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    try {
      await initDB();
      if (canEdit) await pruneOldWorkLogs(WORK_LOG_RETENTION_DAYS);
      const [nextNotes, nextSchedules, nextWorkLogs, nextSamples] = await Promise.all([
        getAllNotesCached(),
        getAllSchedules(),
        getAllWorkLogs(),
        getAllSamples(),
      ]);
      if (!mountedRef.current || seq !== loadSeqRef.current) return false;
      setNotes(nextNotes);
      setSchedules(nextSchedules);
      setWorkLogs(nextWorkLogs);
      setSamples(nextSamples);
      return true;
    } catch (error) {
      if (mountedRef.current && seq === loadSeqRef.current) {
        console.error('[calendar] 로드 실패', error);
      }
      return false;
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) setLoading(false);
    }
  }, [canEdit, mountedRef]);

  useEffect(() => {
    load();
  }, [load]);

  return { notes, schedules, workLogs, samples, loading, load };
}
