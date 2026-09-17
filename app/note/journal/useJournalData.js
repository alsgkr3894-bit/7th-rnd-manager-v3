/**
 * app/note/journal/useJournalData.js — 연구일지 페이지 데이터 로드·파생 상태
 *
 * 노트/샘플/시장조사/일정을 로드해 하나의 journalRecords로 합치고,
 * 선택된 날짜·월·검색어에 맞춰 화면에 필요한 파생 목록들을 계산한다.
 */
'use client';
import { useMemo } from 'react';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllNotesCached } from '@/lib/note';
import { getAllSchedules } from '@/lib/note/schedules';
import { getAllSamples } from '@/lib/sample';
import { getAllMarketResearch } from '@/lib/note/market-research';
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';
import { marketResearchToUnifiedRecord, sampleToUnifiedRecord } from '@/lib/note/unified-records';
import { expandOccurrences } from '@/app/note/calendar/_recurrence';
import { monthBounds, noteDayKey, safeMonth } from './journalDates';
import { occursOnDate } from './journalSchedules';
import { withRelatedJournalPhotos, withoutJournalSourceDuplicatePhotos } from './journalPhotos';
import { journalEntryMatches } from './journalSearch';

export function useJournalData({ date, month, search }) {
  // date 변경은 re-fetch 없이 JS 필터만 하므로 deps 불필요
  const {
    data: notes = [],
    loading: notesLoading,
    reload: reloadNotes,
  } = useDBLoad(() => getAllNotesCached(), {
    initialData: [],
    onError: err => console.error('[note/journal] load failed', err),
  });
  const { data: samples = [], loading: samplesLoading } = useDBLoad(() => getAllSamples(), {
    initialData: [],
    onError: err => console.error('[note/journal] samples load failed', err),
  });
  const { data: marketResearchRows = [], loading: marketResearchLoading } = useDBLoad(
    () => getAllMarketResearch(),
    {
      initialData: [],
      onError: err => console.error('[note/journal] market research load failed', err),
    }
  );
  const { data: schedules = [] } = useDBLoad(() => getAllSchedules(), {
    initialData: [],
    onError: err => console.error('[note/journal] schedules load failed', err),
  });

  const sampleRecords = useMemo(
    () => (Array.isArray(samples) ? samples.map(sampleToUnifiedRecord) : []),
    [samples]
  );
  const marketResearchRecords = useMemo(
    () =>
      Array.isArray(marketResearchRows)
        ? marketResearchRows.map(marketResearchToUnifiedRecord)
        : [],
    [marketResearchRows]
  );
  const journalRecords = useMemo(
    () => [...notes, ...sampleRecords, ...marketResearchRecords],
    [notes, sampleRecords, marketResearchRecords]
  );
  const loading = notesLoading || samplesLoading || marketResearchLoading;

  const rawDayNotes = useMemo(
    () =>
      journalRecords
        .filter(n => noteDayKey(n) === date)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [journalRecords, date]
  );
  const dayNotesWithRelatedPhotos = useMemo(
    () => withRelatedJournalPhotos(rawDayNotes, notes),
    [rawDayNotes, notes]
  );
  const dayNotes = useMemo(
    () => withoutJournalSourceDuplicatePhotos(dayNotesWithRelatedPhotos),
    [dayNotesWithRelatedPhotos]
  );

  const datesWithNotes = useMemo(() => {
    const s = new Set();
    journalRecords.forEach(n => {
      const d = noteDayKey(n);
      if (d) s.add(d);
    });
    schedules.forEach(schedule => {
      if (schedule.date) s.add(String(schedule.date).slice(0, 10));
    });
    return [...s].sort().reverse();
  }, [journalRecords, schedules]);

  const daySchedules = useMemo(
    () =>
      schedules
        .filter(schedule => occursOnDate(schedule, date))
        .map(schedule => ({ ...schedule, _occurrenceDate: date }))
        .sort(
          (a, b) =>
            String(a.time || '').localeCompare(String(b.time || '')) ||
            String(a.title || '').localeCompare(String(b.title || ''), 'ko')
        ),
    [schedules, date]
  );

  const monthEntries = useMemo(() => {
    const safe = safeMonth(month);
    const { start, end } = monthBounds(safe);
    const notesByDate = new Map();
    const schedulesByDate = new Map();

    journalRecords.forEach(note => {
      const day = noteDayKey(note);
      if (!day.startsWith(safe)) return;
      if (!notesByDate.has(day)) notesByDate.set(day, []);
      notesByDate.get(day).push(note);
    });

    schedules.forEach(schedule => {
      expandOccurrences(schedule, start, end).forEach(day => {
        if (!day.startsWith(safe)) return;
        if (!schedulesByDate.has(day)) schedulesByDate.set(day, []);
        schedulesByDate.get(day).push({ ...schedule, _occurrenceDate: day });
      });
    });

    const dates = new Set([...notesByDate.keys(), ...schedulesByDate.keys()]);
    return [...dates]
      .sort((a, b) => b.localeCompare(a))
      .map(day => {
        const entryNotes = (notesByDate.get(day) || []).sort((a, b) =>
          (a.createdAt || '').localeCompare(b.createdAt || '')
        );
        const entrySchedules = (schedulesByDate.get(day) || []).sort(
          (a, b) =>
            String(a.time || '').localeCompare(String(b.time || '')) ||
            String(a.title || '').localeCompare(String(b.title || ''), 'ko')
        );
        return {
          date: day,
          notes: entryNotes,
          schedules: entrySchedules,
          journal: entryNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE) || null,
        };
      });
  }, [journalRecords, schedules, month]);

  const filteredMonthEntries = useMemo(
    () => monthEntries.filter(entry => journalEntryMatches(entry, search)),
    [monthEntries, search]
  );

  const journalEntry = useMemo(
    () => dayNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE) || null,
    [dayNotes]
  );

  return {
    loading,
    notes,
    reloadNotes,
    journalRecords,
    dayNotes,
    datesWithNotes,
    daySchedules,
    monthEntries,
    filteredMonthEntries,
    journalEntry,
  };
}
