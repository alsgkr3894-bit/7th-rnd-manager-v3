/**
 * app/note/journal/useJournalLeaveGuard.js — 저장 안 한 보고서를 두고 다른 날짜·화면으로 갈 때 확인
 *
 * 목록 줄·이전/다음·날짜 조회·기록 수정 버튼으로 이동하면 작성 중이던 보고서가 조용히 사라졌다.
 * 저장 안 된 변경이 있으면 이동 전에 묻고, 브라우저 닫기/새로고침은 useBeforeUnload로 막는다.
 */
'use client';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { parseNoteQuickDate } from '@/lib/note/date-input';

export const JOURNAL_LEAVE_MESSAGE =
  '저장하지 않은 보고서 내용이 있습니다. 이동하면 작성한 내용이 사라집니다. 이동할까요?';

/**
 * @param {boolean} dirty - 저장 안 된 변경 여부
 * @param {{ nav: object, router: object, datesWithNotes: string[] }} deps
 * @returns 확인을 거치는 이동 함수들
 */
export function useJournalLeaveGuard(dirty, { nav, router, datesWithNotes }) {
  useBeforeUnload(dirty, JOURNAL_LEAVE_MESSAGE);

  function confirmLeave() {
    if (!dirty) return true;
    return typeof window === 'undefined' ? true : window.confirm(JOURNAL_LEAVE_MESSAGE);
  }

  /** fn을 실행하기 전에 확인한다 — 취소하면 아무 일도 하지 않는다 */
  function guard(fn) {
    return (...args) => (confirmLeave() ? fn(...args) : undefined);
  }

  return {
    goPrev: guard(() => nav.goToAdjacentDate(datesWithNotes, 'prev')),
    goNext: guard(() => nav.goToAdjacentDate(datesWithNotes, 'next')),
    // 목록에서 날짜 고르기 — 지금 날짜면 묻지 않는다. 이동했으면(또는 같은 날짜면) true,
    // 확인창에서 취소하면 false(목록 탭에 그대로 남는다)
    selectDate(day) {
      if (day === nav.date) return true;
      if (!confirmLeave()) return false;
      nav.setDate(day);
      return true;
    },
    guardedRouter: { push: guard(url => router.push(url)) },
    // 날짜 조회·빠른 입력은 실제로 날짜가 바뀔 때만 묻는다(빠른 입력은 칸을 벗어날 때도 불린다)
    applyDate(value) {
      const next = String(value ?? nav.dateDraft ?? '').trim();
      if (next && next !== nav.date && !confirmLeave()) return;
      nav.applyDate(value);
    },
    // 빠른 입력은 칸을 벗어날 때도 불린다 — 실제로 다른 날짜로 읽힐 때만 묻는다
    // (잘못된 입력·같은 날짜면 묻지 않고, 저장 버튼 클릭이 확인창에 먹히지 않게)
    applyQuickDate(value) {
      const raw = String(value ?? nav.quickDateDraft ?? '').trim();
      const target = raw ? parseNoteQuickDate(raw, { referenceDate: nav.date }) : null;
      if (target && target !== nav.date && !confirmLeave()) return;
      nav.applyQuickDate(value);
    },
  };
}
