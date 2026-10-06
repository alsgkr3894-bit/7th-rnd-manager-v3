/**
 * app/note/journal/useJournalData.js — 연구일지 페이지 데이터 로드·파생 상태
 *
 * 노트/샘플/시장조사/일정을 로드해 하나의 journalRecords로 합치고,
 * 선택된 날짜·월·검색어에 맞춰 화면에 필요한 파생 목록들을 계산한다.
 */
'use client';
import { useMemo } from 'react';
import { useDBLoad } from '@/hooks/useDBLoad';
import { todayLocalDate } from '@/lib/date/local-date';
import { getAllNotesCached } from '@/lib/note';
import { getAllSchedules } from '@/lib/note/schedules';
import { getAllSamples } from '@/lib/sample';
import { getAllMarketResearch } from '@/lib/note/market-research';
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';
import { marketResearchToUnifiedRecord, sampleToUnifiedRecord } from '@/lib/note/unified-records';
import { addDays, monthBounds, noteDayKey, safeMonth } from './journalDates';
import { occursOnDate } from './journalSchedules';
import { withRelatedJournalPhotos, withoutJournalSourceDuplicatePhotos } from './journalPhotos';
import { journalEntryMatches, journalEntryMatchesFilter } from './journalSearch';
import { groupJournalEntries } from './journalEntries';

export { groupJournalEntries };

export function useJournalData({ date, month, search, listFilter = 'all' }) {
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
    const { start, end } = monthBounds(safeMonth(month));
    return groupJournalEntries(journalRecords, schedules, start, end);
  }, [journalRecords, schedules, month]);

  // 검색어가 있으면 달과 관계없이 전체 기간에서 찾는다. 반복 일정이 끝없이 펼쳐지지 않게
  // 가장 이른 기록·일정 ~ (가장 늦은 기록·일정, 오늘+1년 중 늦은 날)까지만 펼친다.
  const hasSearch = String(search || '').trim().length > 0;
  const allEntries = useMemo(() => {
    if (!hasSearch) return [];
    const days = [
      ...journalRecords.map(noteDayKey),
      ...schedules.map(schedule => String(schedule?.date || '').slice(0, 10)),
    ]
      .filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day))
      .sort();
    if (days.length === 0) return [];
    const horizon = addDays(todayLocalDate(), 366);
    const last = days[days.length - 1];
    return groupJournalEntries(journalRecords, schedules, days[0], last > horizon ? last : horizon);
  }, [hasSearch, journalRecords, schedules]);

  const filteredMonthEntries = useMemo(
    () =>
      (hasSearch ? allEntries : monthEntries)
        .filter(entry => journalEntryMatches(entry, search))
        .filter(entry => journalEntryMatchesFilter(entry, listFilter)),
    [hasSearch, allEntries, monthEntries, search, listFilter]
  );

  // 작성 칸은 저장된 원본에서 만든다 — dayNotes는 화면용으로 관련 노트 사진을 합치고 같은 날 노트와
  // 겹치는 사진을 빼 둔 사본이라, 그걸로 저장하면 일지 사진이 지워지거나 남의 사진이 붙었다.
  const journalEntry = useMemo(
    () => rawDayNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE) || null,
    [rawDayNotes]
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
    searchScope: hasSearch ? 'all' : 'month',
    journalEntry,
  };
}
