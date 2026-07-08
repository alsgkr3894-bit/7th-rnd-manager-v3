'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { showToast } from '@/components/Toast';
import { useDBLoad } from '@/hooks/useDBLoad';
import { addNote, getAllNotesCached, updateNote } from '@/lib/note';
import { getAllSchedules } from '@/lib/note/schedules';
import { getAllSamples } from '@/lib/sample';
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import {
  isUnifiedSampleRecord,
  sampleToUnifiedRecord,
  unifiedSampleSourceId,
} from '@/lib/note/unified-records';
import { buildJournalPrintHtml } from '@/lib/note/journal-print';
import { openPrintWindow } from '@/lib/print/window-print';
import { WebJournalCard } from '@/components/note/WebJournalCard';
import { todayLocalDate, formatLocalDateInput } from '@/lib/date/local-date';
import { parseNoteQuickDate } from '@/lib/note/date-input';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { expandOccurrences } from '@/app/note/calendar/_recurrence';
import { buildNoteIdeaGroups, collectLatestRoundNotePhotos } from '../noteIdeaGroups';
import { JournalEntryEditor } from './_JournalEntryEditor';

// 노트의 표시용 날짜 키. testDate는 이미 YYYY-MM-DD(정규형)이라 그대로 쓰고,
// createdAt 폴백만 로컬 달력일자로 변환한다(UTC slice 시 자정 부근 전날로 새던 문제 방지).
function noteDayKey(n) {
  if (n?.testDate) return String(n.testDate).slice(0, 10);
  return n?.createdAt ? formatLocalDateInput(new Date(n.createdAt)) : '';
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const EMPTY_JOURNAL_FORM = {
  work: '',
  result: '',
  next: '',
  photos: [],
};

function toDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${dateStr} (${DAY_LABELS[d.getDay()]})`;
}

function safeMonth(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}$/.test(text) ? text : todayLocalDate().slice(0, 7);
}

function monthBounds(month) {
  const safe = safeMonth(month);
  const [year, monthNumber] = safe.split('-').map(Number);
  return {
    start: `${safe}-01`,
    end: formatLocalDateInput(new Date(year, monthNumber, 0)),
  };
}

function shiftMonth(month, delta) {
  const safe = safeMonth(month);
  const [year, monthNumber] = safe.split('-').map(Number);
  return formatLocalDateInput(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7);
}

function monthLabel(month) {
  const safe = safeMonth(month);
  const [year, monthNumber] = safe.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDateInput(date);
}

function weekBounds(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const mondayOffset = (date.getDay() + 6) % 7;
  const start = addDays(dateStr, -mondayOffset);
  return { start, end: addDays(start, 6) };
}

function normalizeRange(start, end) {
  const safeStart = /^\d{4}-\d{2}-\d{2}$/.test(String(start || '')) ? start : todayLocalDate();
  const safeEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(end || '')) ? end : safeStart;
  return safeStart <= safeEnd
    ? { start: safeStart, end: safeEnd }
    : { start: safeEnd, end: safeStart };
}

function printRangeForMode(mode, { date, month, customStart, customEnd }) {
  if (mode === 'week') return weekBounds(date);
  if (mode === 'month') return monthBounds(month);
  if (mode === 'custom') return normalizeRange(customStart, customEnd);
  return { start: date, end: date };
}

function printRangeLabel(mode, range) {
  if (range.start === range.end) return toDateLabel(range.start);
  const prefix = mode === 'week' ? '주간' : mode === 'month' ? '월간' : '선택기간';
  return `${prefix} ${range.start} ~ ${range.end}`;
}

function isWithinRange(day, range) {
  return Boolean(day && day >= range.start && day <= range.end);
}

function occursOnDate(schedule, date) {
  return expandOccurrences(schedule, date, date).includes(date);
}

function scheduleLine(schedule) {
  const head = [schedule.time, schedule.title].filter(Boolean).join(' ');
  const tail = [schedule.type, schedule.description].filter(Boolean).join(' · ');
  return tail ? `- ${head} (${tail})` : `- ${head}`;
}

function buildScheduleText(schedules) {
  return schedules.map(scheduleLine).filter(Boolean).join('\n');
}

function mergeJournalText(...values) {
  return values
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
}

function hasJournalText(form) {
  return (
    Object.entries(form).some(([key, value]) => key !== 'photos' && String(value || '').trim()) ||
    (Array.isArray(form.photos) && form.photos.length > 0)
  );
}

function journalPhotoKey(photo) {
  return [photo?.data, photo?.caption, photo?.name].map(value => String(value || '')).join('|');
}

function mergeJournalPhotos(...photoGroups) {
  const merged = [];
  const seen = new Set();
  for (const group of photoGroups) {
    const photos = Array.isArray(group) ? group : [];
    for (const photo of photos) {
      if (!photo || typeof photo !== 'object' || !photo.data) continue;
      const key = journalPhotoKey(photo);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(photo);
    }
  }
  return merged;
}

function filterJournalPhotosAgainstSources(photos, sourcePhotos) {
  const sourceKeys = new Set(
    (Array.isArray(sourcePhotos) ? sourcePhotos : []).map(journalPhotoKey).filter(Boolean)
  );
  if (!sourceKeys.size) return Array.isArray(photos) ? photos : [];
  return (Array.isArray(photos) ? photos : []).filter(photo => !sourceKeys.has(journalPhotoKey(photo)));
}

function withoutJournalSourceDuplicatePhotos(records) {
  const source = Array.isArray(records) ? records : [];
  if (!source.length) return source;

  const sourcePhotosByDay = new Map();
  for (const note of source) {
    if (note?.noteType === JOURNAL_NOTE_TYPE) continue;
    const day = noteDayKey(note);
    if (!day) continue;
    const photos = Array.isArray(note?.photos) ? note.photos : [];
    if (!photos.length) continue;
    const bucket = sourcePhotosByDay.get(day) || [];
    bucket.push(...photos);
    sourcePhotosByDay.set(day, bucket);
  }

  if (!sourcePhotosByDay.size) return source;

  return source.map(note => {
    if (note?.noteType !== JOURNAL_NOTE_TYPE) return note;
    const sourcePhotos = sourcePhotosByDay.get(noteDayKey(note)) || [];
    const photos = filterJournalPhotosAgainstSources(note?.photos, sourcePhotos);
    return photos === note?.photos ? note : { ...note, photos };
  });
}

function buildJournalRelatedPhotoLookup(notes) {
  const source = Array.isArray(notes) ? notes : [];
  const lookup = new Map();
  const groups = buildNoteIdeaGroups(source, source);

  for (const group of groups) {
    const photos = collectLatestRoundNotePhotos(group.notes, 99);
    for (const note of group.notes || []) {
      if (note?.id) lookup.set(note.id, photos);
    }
  }

  return lookup;
}

function withRelatedJournalPhotos(dayNotes, allNotes) {
  const notes = Array.isArray(dayNotes) ? dayNotes : [];
  if (!notes.length) return notes;

  const relatedPhotosByNoteId = buildJournalRelatedPhotoLookup(allNotes);
  return notes.map(note => {
    const relatedPhotos = note?.id ? relatedPhotosByNoteId.get(note.id) : [];
    return {
      ...note,
      photos: mergeJournalPhotos(note?.photos, relatedPhotos),
    };
  });
}

function journalFormFromEntry(journalEntry) {
  if (!journalEntry) return EMPTY_JOURNAL_FORM;
  return {
    work: journalEntry.testContent || '',
    result: mergeJournalText(journalEntry.tasteEval, journalEntry.improvements),
    next: mergeJournalText(journalEntry.nextAction, journalEntry.materials),
    photos: Array.isArray(journalEntry.photos) ? journalEntry.photos : [],
  };
}

function buildJournalNoteFromForm(date, form, existingEntry) {
  const title = existingEntry?.title || `${date} 연구일지`;
  return {
    ...(existingEntry || {}),
    title,
    menuName: existingEntry?.menuName || title,
    testDate: date,
    category: existingEntry?.category || '기타',
    noteType: JOURNAL_NOTE_TYPE,
    status: existingEntry?.status || NOTE_STATUS.TEST,
    testContent: String(form.work || '').trim(),
    materials: '',
    tasteEval: String(form.result || '').trim(),
    improvements: '',
    nextAction: String(form.next || '').trim(),
    tags: existingEntry?.tags || '연구일지',
    photos: Array.isArray(form.photos) ? form.photos : [],
  };
}

function mergeJournalPrintNotesForDate(notes, currentJournalNote, targetDate) {
  if (!currentJournalNote) return notes;
  let replaced = false;
  const merged = notes.map(note => {
    if (note.noteType !== JOURNAL_NOTE_TYPE || noteDayKey(note) !== targetDate) return note;
    replaced = true;
    return { ...note, ...currentJournalNote, id: note.id };
  });
  return replaced
    ? merged
    : [...merged, currentJournalNote].sort(
        (a, b) =>
          noteDayKey(a).localeCompare(noteDayKey(b)) ||
          String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
}

function MonthEntrySummary({ entry }) {
  const journalText = [
    entry.journal?.testContent,
    entry.journal?.tasteEval,
    entry.journal?.nextAction,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)[0];
  if (journalText) return <span>{journalText}</span>;
  if (entry.schedules.length > 0) return <span>{entry.schedules[0].title}</span>;
  return <span>{entry.notes[0]?.title || entry.notes[0]?.menuName || '기록 보기'}</span>;
}

function noteSearchText(note) {
  const photoText = (Array.isArray(note?.photos) ? note.photos : [])
    .map(photo => [photo?.caption, photo?.name].filter(Boolean).join(' '))
    .join(' ');
  return [
    note?.title,
    note?.menuName,
    note?.menuCode,
    note?.category,
    note?.status,
    note?.noteType,
    note?.testContent,
    note?.materials,
    note?.tasteEval,
    note?.improvements,
    note?.nextAction,
    note?.tags,
    photoText,
  ]
    .map(value => String(value || '').toLowerCase())
    .join(' ');
}

function scheduleSearchText(schedule) {
  return [
    schedule?.title,
    schedule?.description,
    schedule?.type,
    schedule?.time,
    schedule?._occurrenceDate,
  ]
    .map(value => String(value || '').toLowerCase())
    .join(' ');
}

function journalEntryMatches(entry, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return true;
  const haystack = [
    entry?.date,
    noteSearchText(entry?.journal),
    ...(entry?.notes || []).map(noteSearchText),
    ...(entry?.schedules || []).map(scheduleSearchText),
  ].join(' ');
  return haystack.includes(q);
}

function JournalMonthList({
  month,
  entries,
  totalEntries,
  selectedDate,
  onMonthChange,
  onSelectDate,
  search,
  onSearch,
}) {
  return (
    <section className="card" style={{ padding: 18, marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div>
          <div className="card-title">월별 목록</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {monthLabel(month)} · {entries.length}일 표시 / 전체 {totalEntries}일
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 220, flex: '1 1 220px', minWidth: 0 }}>
            <SearchBox value={search} onChange={onSearch} placeholder="일지·노트·일정 검색" />
          </div>
          <button
            className="btn sm"
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            이전 달
          </button>
          <input
            className="form-input"
            type="month"
            value={safeMonth(month)}
            onChange={event => {
              if (event.target.value) onMonthChange(event.target.value);
            }}
            style={{ width: 132 }}
          />
          <button
            className="btn sm"
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            다음 달
          </button>
        </div>
      </div>

      {totalEntries === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 8,
            padding: '18px 14px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          이 달에 저장된 연구일지나 일정이 없습니다.
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 8,
            padding: '18px 14px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          검색 결과가 없습니다. 다른 키워드로 검색해보세요.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {entries.map(entry => {
            const selected = entry.date === selectedDate;
            return (
              <button
                key={entry.date}
                type="button"
                onClick={() => onSelectDate(entry.date)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '118px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'center',
                  textAlign: 'left',
                  borderRadius: 8,
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'var(--accent-soft)' : 'var(--surface)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <strong
                  style={{ fontSize: 13, color: selected ? 'var(--accent-text)' : 'var(--text-1)' }}
                >
                  {toDateLabel(entry.date)}
                </strong>
                <span style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                  <span
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >
                    {entry.journal && <span className="chip">연구일지</span>}
                    {entry.notes.length > 0 && (
                      <span className="chip">노트 {entry.notes.length}</span>
                    )}
                    {entry.schedules.length > 0 && (
                      <span className="chip">일정 {entry.schedules.length}</span>
                    )}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-2)',
                      fontSize: 13,
                    }}
                  >
                    <MonthEntrySummary entry={entry} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [date, setDate] = useState(() => todayLocalDate());
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [quickDateDraft, setQuickDateDraft] = useState('');
  const [quickDateError, setQuickDateError] = useState(false);
  const [search, setSearch] = useState('');
  const [printMode, setPrintMode] = useState('day');
  const [customStart, setCustomStart] = useState(() => todayLocalDate());
  const [customEnd, setCustomEnd] = useState(() => todayLocalDate());
  const [journalForm, setJournalForm] = useState(EMPTY_JOURNAL_FORM);
  const [saving, setSaving] = useState(false);

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
  const { data: schedules = [] } = useDBLoad(() => getAllSchedules(), {
    initialData: [],
    onError: err => console.error('[note/journal] schedules load failed', err),
  });

  const sampleRecords = useMemo(
    () => (Array.isArray(samples) ? samples.map(sampleToUnifiedRecord) : []),
    [samples]
  );
  const journalRecords = useMemo(() => [...notes, ...sampleRecords], [notes, sampleRecords]);
  const loading = notesLoading || samplesLoading;

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

  useEffect(() => {
    setMonth(date.slice(0, 7));
  }, [date]);

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

  const currentJournalPrintNote = useMemo(
    () =>
      hasJournalText(journalForm)
        ? buildJournalNoteFromForm(date, journalForm, journalEntry)
        : null,
    [date, journalForm, journalEntry]
  );

  const printRange = useMemo(
    () => printRangeForMode(printMode, { date, month, customStart, customEnd }),
    [printMode, date, month, customStart, customEnd]
  );
  const printRangeTitle = useMemo(
    () => printRangeLabel(printMode, printRange),
    [printMode, printRange]
  );
  const printPeriodNotes = useMemo(() => {
    const periodNotes = journalRecords
      .filter(note => isWithinRange(noteDayKey(note), printRange))
      .sort(
        (a, b) =>
          noteDayKey(a).localeCompare(noteDayKey(b)) ||
          String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
    const merged =
      currentJournalPrintNote && isWithinRange(date, printRange)
        ? mergeJournalPrintNotesForDate(periodNotes, currentJournalPrintNote, date)
        : periodNotes;
    return withoutJournalSourceDuplicatePhotos(merged);
  }, [journalRecords, printRange, currentJournalPrintNote, date]);

  useEffect(() => {
    setJournalForm(journalFormFromEntry(journalEntry));
  }, [date, dayNotes, journalEntry]);

  function goPrev() {
    const idx = datesWithNotes.indexOf(date);
    if (idx < datesWithNotes.length - 1) {
      const nextDate = datesWithNotes[idx + 1];
      setDate(nextDate);
      setMonth(safeMonth(nextDate.slice(0, 7)));
      setQuickDateError(false);
    }
  }
  function goNext() {
    const idx = datesWithNotes.indexOf(date);
    if (idx > 0) {
      const nextDate = datesWithNotes[idx - 1];
      setDate(nextDate);
      setMonth(safeMonth(nextDate.slice(0, 7)));
      setQuickDateError(false);
    }
  }

  function applyQuickDate(value = quickDateDraft) {
    const raw = String(value || '').trim();
    if (!raw) {
      setQuickDateError(false);
      return;
    }
    const parsed = parseNoteQuickDate(raw, { referenceDate: date });
    if (!parsed) {
      setQuickDateError(true);
      return;
    }
    setDate(parsed);
    setMonth(safeMonth(parsed.slice(0, 7)));
    setQuickDateDraft('');
    setQuickDateError(false);
  }

  const hasPrev = datesWithNotes.indexOf(date) < datesWithNotes.length - 1;
  const hasNext = datesWithNotes.indexOf(date) > 0;
  const dateLabel = toDateLabel(date);

  function updateJournalForm(field, value) {
    setJournalForm(prev => ({ ...prev, [field]: value }));
  }

  function useSchedulesInJournal() {
    if (!canEdit) return;
    const text = buildScheduleText(daySchedules);
    if (!text) return;
    setJournalForm(prev => ({
      ...prev,
      next: prev.next?.trim() ? `${prev.next.trim()}\n${text}` : text,
    }));
  }

  async function saveJournalEntry() {
    if (!canEdit || saving) return;
    if (!journalEntry && !hasJournalText(journalForm)) {
      showToast('저장할 일지 내용을 입력해주세요', 'warn');
      return;
    }
    const title = `${date} 연구일지`;
    const payload = {
      title,
      menuName: title,
      testDate: date,
      category: '기타',
      noteType: JOURNAL_NOTE_TYPE,
      status: journalEntry?.status || NOTE_STATUS.TEST,
      testContent: journalForm.work.trim(),
      materials: '',
      tasteEval: journalForm.result.trim(),
      improvements: '',
      nextAction: journalForm.next.trim(),
      tags: '연구일지',
      photos: Array.isArray(journalForm.photos) ? journalForm.photos : [],
    };
    setSaving(true);
    try {
      if (journalEntry) await updateNote(journalEntry.id, payload);
      else await addNote(payload);
      showToast('연구일지를 저장했습니다', 'ok');
      reloadNotes();
    } catch (error) {
      console.error('[note/journal] save failed', error);
      showToast('연구일지 저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['RND', '연구일지']}
        title="연구일지"
        sub={
          loading
            ? '로딩 중…'
            : `${dateLabel} · 기록 ${dayNotes.length}건 · 일정 ${daySchedules.length}건`
        }
        actions={
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              flex: '1 1 100%',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <button className="btn" onClick={goPrev} disabled={!hasPrev} title="이전 일자">
              <Icon.arrowUp style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => {
                if (e.target.value) {
                  setDate(e.target.value);
                  setMonth(safeMonth(e.target.value.slice(0, 7)));
                  setQuickDateError(false);
                }
              }}
              style={{
                width: 'min(190px, 100%)',
                flex: '1 1 150px',
                minWidth: 0,
                minHeight: 40,
                fontSize: 16,
                fontWeight: 800,
                padding: '7px 10px',
              }}
            />
            <input
              className="form-input"
              value={quickDateDraft}
              onChange={event => {
                setQuickDateDraft(event.target.value);
                setQuickDateError(false);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyQuickDate();
                }
              }}
              onBlur={() => applyQuickDate()}
              inputMode="numeric"
              placeholder="240502"
              title={quickDateError ? '날짜 확인' : '빠른 날짜 입력'}
              style={{
                width: 94,
                flex: '0 1 94px',
                minWidth: 0,
                minHeight: 40,
                fontSize: 13,
                borderColor: quickDateError ? 'var(--negative)' : undefined,
              }}
            />
            <button className="btn" onClick={goNext} disabled={!hasNext} title="다음 일자">
              <Icon.arrowDown style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            <select
              className="form-input"
              value={printMode}
              onChange={event => setPrintMode(event.target.value)}
              style={{ width: 118, minHeight: 40, flex: '0 1 118px' }}
              title="PDF 출력 기간"
            >
              <option value="day">오늘/선택일</option>
              <option value="week">주간</option>
              <option value="month">월간</option>
              <option value="custom">선택기간</option>
            </select>
            {printMode === 'custom' && (
              <>
                <input
                  type="date"
                  className="form-input"
                  value={customStart}
                  onChange={event => event.target.value && setCustomStart(event.target.value)}
                  style={{ width: 142, minHeight: 40, flex: '0 1 142px' }}
                  title="PDF 시작일"
                />
                <input
                  type="date"
                  className="form-input"
                  value={customEnd}
                  onChange={event => event.target.value && setCustomEnd(event.target.value)}
                  style={{ width: 142, minHeight: 40, flex: '0 1 142px' }}
                  title="PDF 종료일"
                />
              </>
            )}
            <button
              className="btn primary"
              disabled={printPeriodNotes.length === 0}
              onClick={() =>
                openPrintWindow(
                  buildJournalPrintHtml(printRangeTitle, printPeriodNotes, {
                    title: printMode === 'day' ? '오늘 한 일 보고서' : '연구일지 종합본',
                  }),
                  {
                    width: 800,
                    height: 900,
                  }
                )
              }
              title={
                printPeriodNotes.length === 0 ? 'PDF로 출력할 연구일지가 없습니다' : printRangeTitle
              }
            >
              <Icon.download style={{ width: 14, height: 14 }} /> 종합 PDF
            </button>
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: 20,
                height: 100,
                background: 'var(--surface-2)',
                borderColor: 'transparent',
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : (
        <>
          <JournalEntryEditor
            dateLabel={dateLabel}
            form={journalForm}
            onChange={updateJournalForm}
            onSave={saveJournalEntry}
            onUseSchedules={useSchedulesInJournal}
            saving={saving}
            canEdit={canEdit}
            existingEntry={journalEntry}
            daySchedules={daySchedules}
          />

          <JournalMonthList
            month={month}
            entries={filteredMonthEntries}
            totalEntries={monthEntries.length}
            selectedDate={date}
            onMonthChange={setMonth}
            onSelectDate={setDate}
            search={search}
            onSearch={setSearch}
          />

          {dayNotes.length === 0 ? (
            <div
              className="card"
              style={{ padding: '32px 24px', textAlign: 'center', marginTop: 16 }}
            >
              <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
                {date}에 저장된 연구일지나 테스트 노트가 없습니다.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              {dayNotes.map((note, idx) => (
                <WebJournalCard
                  key={note.id}
                  note={note}
                  index={idx + 1}
                  onEdit={() =>
                    isUnifiedSampleRecord(note)
                      ? router.push(`/note/sample/${unifiedSampleSourceId(note)}`)
                      : router.push(`/note/${note.id}`)
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
