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
import { adjacentJournalDate, safeMonth, toDateLabel } from './journalDates';

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

  // 화면 안에서 날짜를 바꾸면 주소의 ?date=도 맞춘다 — 예전 ?date=가 남아 새로고침하면
  // 그 날짜로 되돌아갔다. (효과가 아니라 바꾸는 순간에 해서 첫 로드 복원과 섞이지 않는다)
  function changeDate(value) {
    setDate(value);
    const url = new URL(window.location.href);
    if (url.searchParams.has('date') && url.searchParams.get('date') !== value) {
      url.searchParams.set('date', value);
      window.history.replaceState(window.history.state, '', url);
    }
  }

  // 수정 화면에서 돌아오면(?date=) 보던 날짜로 복원한다 — 전엔 항상 오늘로 시작했다
  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get('date') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(back)) return;
    setDate(back);
    setMonth(safeMonth(back.slice(0, 7)));
  }, []);

  function jumpToDate(value) {
    changeDate(value);
    setMonth(safeMonth(value.slice(0, 7)));
    setQuickDateError(false);
  }

  // 일지·노트가 있는 날짜 목록(datesWithNotes)은 데이터 훅에서 오므로 호출 시점에 받는다.
  function goToAdjacentDate(datesWithNotes, direction) {
    const target = adjacentJournalDate(datesWithNotes, date, direction);
    if (target) jumpToDate(target);
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
    setDate: changeDate,
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
