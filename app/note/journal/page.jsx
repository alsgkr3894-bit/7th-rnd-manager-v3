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

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [date, setDate] = useState(() => todayLocalDate());
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
    if (idx < datesWithNotes.length - 1) setDate(datesWithNotes[idx + 1]);
  }
  function goNext() {
    const idx = datesWithNotes.indexOf(date);
    if (idx > 0) setDate(datesWithNotes[idx - 1]);
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" onClick={goPrev} disabled={!hasPrev} title="이전 일자">
              <Icon.arrowUp style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => {
                if (e.target.value) setDate(e.target.value);
              }}
              style={{ width: 148 }}
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
                <Icon.download style={{ width: 14, height: 14 }} /> PDF 출력
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
