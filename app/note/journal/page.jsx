'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { StickySaveBar } from '@/components/ui/StickySaveBar';
import { showToast } from '@/components/Toast';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { addNote, getAllNotesCached, updateNote } from '@/lib/note';
import { getAllSchedules } from '@/lib/note/schedules';
import { getAllSamples } from '@/lib/sample';
import { getAllMarketResearch } from '@/lib/note/market-research';
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import {
  isUnifiedMarketResearchRecord,
  isUnifiedSampleRecord,
  marketResearchToUnifiedRecord,
  sampleToUnifiedRecord,
  unifiedMarketResearchSourceId,
  unifiedSampleSourceId,
} from '@/lib/note/unified-records';
import { buildJournalPrintHtml } from '@/lib/note/journal-print';
import { openPrintWindow } from '@/lib/print/window-print';
import { WebJournalCard } from '@/components/note/WebJournalCard';
import { NotePhotoLightbox } from '@/app/note/_NotePhotoLightbox';
import { todayLocalDate } from '@/lib/date/local-date';
import { parseNoteQuickDate } from '@/lib/note/date-input';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { expandOccurrences } from '@/app/note/calendar/_recurrence';
import { JournalEntryEditor } from './_JournalEntryEditor';
import { JournalMonthList } from './_JournalMonthList';
import {
  isWithinRange,
  monthBounds,
  noteDayKey,
  printRangeForMode,
  printRangeLabel,
  safeMonth,
  toDateLabel,
} from './journalDates';
import { buildScheduleText, occursOnDate } from './journalSchedules';
import { withRelatedJournalPhotos, withoutJournalSourceDuplicatePhotos } from './journalPhotos';
import {
  EMPTY_JOURNAL_FORM,
  buildJournalNoteFromForm,
  hasJournalText,
  journalFormFromEntry,
  mergeJournalPrintNotesForDate,
} from './journalForm';
import { journalEntryMatches } from './journalSearch';

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [date, setDate] = useState(() => todayLocalDate());
  const [dateDraft, setDateDraft] = useState(() => todayLocalDate());
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [quickDateDraft, setQuickDateDraft] = useState('');
  const [quickDateError, setQuickDateError] = useState(false);
  const [search, setSearch] = useState('');
  const [printMode, setPrintMode] = useState('day');
  const [customStart, setCustomStart] = useState(() => todayLocalDate());
  const [customEnd, setCustomEnd] = useState(() => todayLocalDate());
  const [journalForm, setJournalForm] = useState(EMPTY_JOURNAL_FORM);
  const [saving, setSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

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

  useEffect(() => {
    setMonth(date.slice(0, 7));
    setDateDraft(date);
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

  // 저장 안 된 변경사항이 있는지 — 하단 저장바 상태 표시·저장 버튼 활성화에 쓴다.
  const journalDirty = useMemo(
    () => JSON.stringify(journalForm) !== JSON.stringify(journalFormFromEntry(journalEntry)),
    [journalForm, journalEntry]
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

  function applyDate(value = dateDraft) {
    const raw = String(value || '').trim();
    if (!raw) return;
    setDate(raw);
    setMonth(safeMonth(raw.slice(0, 7)));
    setQuickDateError(false);
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

  useKeyboardSave(saveJournalEntry);

  function updateJournalForm(field, value) {
    setJournalForm(prev => ({ ...prev, [field]: value }));
  }

  function revertJournalForm() {
    setJournalForm(journalFormFromEntry(journalEntry));
  }

  function openJournalPdf() {
    openPrintWindow(
      buildJournalPrintHtml(printRangeTitle, printPeriodNotes, {
        title: printMode === 'day' ? '오늘 한 일 보고서' : '연구일지 종합본',
      }),
      { width: 800, height: 900 }
    );
  }

  function scrollToDayRecords() {
    document
      .getElementById('journal-day-records')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
              value={dateDraft}
              onChange={e => {
                if (e.target.value) setDateDraft(e.target.value);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyDate();
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
            <button
              className={'btn' + (dateDraft !== date ? ' primary' : '')}
              onClick={() => applyDate()}
              disabled={!dateDraft || dateDraft === date}
              title="입력한 날짜로 조회"
            >
              조회
            </button>
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
              onClick={openJournalPdf}
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
            onUseSchedules={useSchedulesInJournal}
            onScrollToRecords={scrollToDayRecords}
            saving={saving}
            canEdit={canEdit}
            existingEntry={journalEntry}
            dirty={journalDirty}
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

          <div id="journal-day-records">
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
                    onPhotoClick={setPreviewPhoto}
                    onEdit={() => {
                      if (isUnifiedSampleRecord(note)) {
                        router.push(`/note/sample/${unifiedSampleSourceId(note)}`);
                      } else if (isUnifiedMarketResearchRecord(note)) {
                        router.push(`/note/market?edit=${unifiedMarketResearchSourceId(note)}`);
                      } else {
                        router.push(`/note/${note.id}`);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && (
        <StickySaveBar
          onCancel={revertJournalForm}
          onSave={saveJournalEntry}
          saving={saving}
          canSave={canEdit && (journalDirty || !journalEntry)}
          cancelLabel="되돌리기"
          saveLabel="보고서 저장"
          savingLabel="저장 중"
          status={
            !canEdit
              ? '관리자만 저장할 수 있습니다'
              : journalDirty
                ? `${dateLabel} · 저장 안 된 변경사항`
                : journalEntry
                  ? `${dateLabel} · 저장됨`
                  : `${dateLabel} · 새 일지`
          }
          extra={
            <button
              type="button"
              className="btn"
              onClick={openJournalPdf}
              disabled={printPeriodNotes.length === 0}
              title={
                printPeriodNotes.length === 0 ? 'PDF로 출력할 연구일지가 없습니다' : printRangeTitle
              }
            >
              <Icon.download style={{ width: 13, height: 13 }} /> PDF
            </button>
          }
        />
      )}

      {previewPhoto && (
        <NotePhotoLightbox
          photo={previewPhoto}
          title={previewPhoto.caption || previewPhoto.name || '사진 보기'}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </main>
  );
}
