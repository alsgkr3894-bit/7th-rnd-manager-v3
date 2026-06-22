'use client';

import { useCallback, useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { getAllNotesCached } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { getAllSchedules } from '@/lib/note/schedules';
import { getAllWorkLogs, pruneOldWorkLogs, WORK_LOG_RETENTION_DAYS } from '@/lib/work-log';

export function useCalendarData({ canEdit = false } = {}) {
  const [notes, setNotes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await initDB();
    if (canEdit) await pruneOldWorkLogs(WORK_LOG_RETENTION_DAYS);
    const [nextNotes, nextSchedules, nextWorkLogs, nextSamples] = await Promise.all([
      getAllNotesCached(),
      getAllSchedules(),
      getAllWorkLogs(),
      getAllSamples(),
    ]);
    setNotes(nextNotes);
    setSchedules(nextSchedules);
    setWorkLogs(nextWorkLogs);
    setSamples(nextSamples);
    setLoading(false);
  }, [canEdit]);

  useEffect(() => {
    load().catch(error => {
      console.error('[calendar] 로드 실패', error);
      setLoading(false);
    });
  }, [load]);

  return { notes, schedules, workLogs, samples, loading, load };
}
