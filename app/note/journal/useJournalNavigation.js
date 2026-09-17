/**
 * app/note/journal/useJournalNavigation.js — 연구일지 날짜 선택·조회 상태
 *
 * 날짜 입력은 조회 버튼(또는 Enter)을 눌러야 반영되는 초안(dateDraft)이며,
 * 빠른 날짜 입력(quickDateDraft)·이전/다음 이동도 함께 관리한다.
 */
'use client';
import { useEffect, useState } from 'react';
import { todayLocalDate } from '@/lib/date/local-date';
import { parseNoteQuickDate } from '@/lib/note/date-input';
import { safeMonth, toDateLabel } from './journalDates';

export function useJournalNavigation() {
  const [date, setDate] = useState(() => todayLocalDate());
  const [dateDraft, setDateDraft] = useState(() => todayLocalDate());
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [quickDateDraft, setQuickDateDraft] = useState('');
  const [quickDateError, setQuickDateError] = useState(false);

  useEffect(() => {
    setMonth(date.slice(0, 7));
    setDateDraft(date);
  }, [date]);

  function jumpToDate(value) {
    setDate(value);
    setMonth(safeMonth(value.slice(0, 7)));
    setQuickDateError(false);
  }

  // 일지·노트가 있는 날짜 목록(datesWithNotes)은 데이터 훅에서 오므로 호출 시점에 받는다.
  function goToAdjacentDate(datesWithNotes, direction) {
    const idx = datesWithNotes.indexOf(date);
    if (direction === 'prev' && idx < datesWithNotes.length - 1) {
      jumpToDate(datesWithNotes[idx + 1]);
    } else if (direction === 'next' && idx > 0) {
      jumpToDate(datesWithNotes[idx - 1]);
    }
  }

  function applyDate(value = dateDraft) {
    const raw = String(value || '').trim();
    if (!raw) return;
    jumpToDate(raw);
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
    jumpToDate(parsed);
    setQuickDateDraft('');
  }

  const dateLabel = toDateLabel(date);

  return {
    date,
    setDate,
    dateDraft,
    setDateDraft,
    month,
    setMonth,
    quickDateDraft,
    setQuickDateDraft,
    quickDateError,
    setQuickDateError,
    goToAdjacentDate,
    applyDate,
    applyQuickDate,
    dateLabel,
  };
}
