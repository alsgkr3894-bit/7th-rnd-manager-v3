'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { useDBLoad } from '@/hooks/useDBLoad';
import { addNote, getAllNotesCached, updateNote } from '@/lib/note';
import { getAllSchedules } from '@/lib/note/schedules';
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import { buildJournalPrintHtml } from '@/lib/note/journal-print';
import { openPrintWindow } from '@/lib/print/window-print';
import { WebJournalCard } from '@/components/note/WebJournalCard';
import { todayLocalDate, formatLocalDateInput } from '@/lib/date/local-date';
import { parseNoteQuickDate } from '@/lib/note/date-input';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { expandOccurrences } from '@/app/note/calendar/_recurrence';
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
  schedule: '',
  tasting: '',
  issue: '',
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

function hasJournalText(form) {
  return (
    Object.entries(form).some(([key, value]) => key !== 'photos' && String(value || '').trim()) ||
    (Array.isArray(form.photos) && form.photos.length > 0)
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

function JournalMonthList({ month, entries, selectedDate, onMonthChange, onSelectDate }) {
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
            {monthLabel(month)} · {entries.length}일 기록
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn sm" type="button" onClick={() => onMonthChange(shiftMonth(month, -1))}>
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
          <button className="btn sm" type="button" onClick={() => onMonthChange(shiftMonth(month, 1))}>
            다음 달
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
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
                <strong style={{ fontSize: 13, color: selected ? 'var(--accent-text)' : 'var(--text-1)' }}>
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
                    {entry.notes.length > 0 && <span className="chip">노트 {entry.notes.length}</span>}
                    {entry.schedules.length > 0 && <span className="chip">일정 {entry.schedules.length}</span>}
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
  const [journalForm, setJournalForm] = useState(EMPTY_JOURNAL_FORM);
  const [saving, setSaving] = useState(false);

  // date 변경은 re-fetch 없이 JS 필터만 하므로 deps 불필요
  const { data: notes = [], loading, reload: reloadNotes } = useDBLoad(() => getAllNotesCached(), {
    initialData: [],
    onError: err => console.error('[note/journal] load failed', err),
  });
  const { data: schedules = [] } = useDBLoad(() => getAllSchedules(), {
    initialData: [],
    onError: err => console.error('[note/journal] schedules load failed', err),
  });

  const dayNotes = useMemo(
    () =>
      notes
        .filter(n => noteDayKey(n) === date)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [notes, date]
  );

  useEffect(() => {
    setMonth(date.slice(0, 7));
  }, [date]);

  const datesWithNotes = useMemo(() => {
    const s = new Set();
    notes.forEach(n => {
      const d = noteDayKey(n);
      if (d) s.add(d);
    });
    schedules.forEach(schedule => {
      if (schedule.date) s.add(String(schedule.date).slice(0, 10));
    });
    return [...s].sort().reverse();
  }, [notes, schedules]);

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

    notes.forEach(note => {
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
  }, [notes, schedules, month]);

  const journalEntry = useMemo(
    () => dayNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE) || null,
    [dayNotes]
  );

  useEffect(() => {
    if (!journalEntry) {
      setJournalForm(EMPTY_JOURNAL_FORM);
      return;
    }
    setJournalForm({
      work: journalEntry.testContent || '',
      schedule: journalEntry.materials || '',
      tasting: journalEntry.tasteEval || '',
      issue: journalEntry.improvements || '',
      next: journalEntry.nextAction || '',
      photos: Array.isArray(journalEntry.photos) ? journalEntry.photos : [],
    });
  }, [date, journalEntry]);

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
      schedule: prev.schedule?.trim() ? `${prev.schedule.trim()}\n${text}` : text,
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
      materials: journalForm.schedule.trim(),
      tasteEval: journalForm.tasting.trim(),
      improvements: journalForm.issue.trim(),
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
        breadcrumb={['메뉴개발노트', '연구일지']}
        title="연구일지"
        sub={loading ? '로딩 중…' : `${dateLabel} · 기록 ${dayNotes.length}건 · 일정 ${daySchedules.length}건`}
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
            {dayNotes.length > 0 && (
              <button
                className="btn primary"
                onClick={() =>
                  openPrintWindow(buildJournalPrintHtml(dateLabel, dayNotes), {
                    width: 800,
                    height: 900,
                  })
                }
              >
                <Icon.download style={{ width: 14, height: 14 }} /> 보고서 PDF
              </button>
            )}
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
            entries={monthEntries}
            selectedDate={date}
            onMonthChange={setMonth}
            onSelectDate={setDate}
          />

          {dayNotes.length === 0 ? (
            <div className="card" style={{ padding: '32px 24px', textAlign: 'center', marginTop: 16 }}>
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
                  onEdit={() => router.push(`/note/${note.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
