/**
 * app/note/journal/useJournalForm.js — 연구일지 작성 폼 상태·저장
 *
 * 폼 값 편집·되돌리기·일정 불러오기와 저장(addNote/updateNote) 처리를 맡는다.
 * viewer는 canEdit=false라 saveJournalEntry가 조용히 종료된다.
 */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { addNote, updateNote } from '@/lib/note';
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import {
  EMPTY_JOURNAL_FORM,
  buildJournalNoteFromForm,
  hasJournalText,
  isJournalFormChanged,
  journalContentFields,
  journalFormFromEntry,
} from './journalForm';
import { buildScheduleText } from './journalSchedules';

export function useJournalForm({
  date,
  journalEntry,
  dayNotes,
  canEdit,
  daySchedules,
  reloadNotes,
}) {
  const [journalForm, setJournalForm] = useState(EMPTY_JOURNAL_FORM);
  const [saving, setSaving] = useState(false);
  // 저장 중 잠금은 ref로 — state는 다음 렌더까지 안 바뀌어 Ctrl+S 연타가 그대로 통과했다.
  const savingRef = useRef(false);
  // 새 일지를 만든 뒤 다시 불러오기 전에 또 저장하면 일지가 하나 더 생기던 문제 — 방금 만든 id로 고친다
  const createdRef = useRef({ date: null, id: null });

  useEffect(() => {
    setJournalForm(journalFormFromEntry(journalEntry));
  }, [date, dayNotes, journalEntry]);

  // 저장 안 된 변경사항이 있는지 — 하단 저장바 상태 표시·저장 버튼 활성화에 쓴다.
  const journalDirty = useMemo(
    () => isJournalFormChanged(journalForm, journalFormFromEntry(journalEntry)),
    [journalForm, journalEntry]
  );

  const currentJournalPrintNote = useMemo(
    () =>
      hasJournalText(journalForm)
        ? buildJournalNoteFromForm(date, journalForm, journalEntry)
        : null,
    [date, journalForm, journalEntry]
  );

  function updateJournalForm(field, value) {
    setJournalForm(prev => ({ ...prev, [field]: value }));
  }

  // 되돌리기는 작성한 내용을 통째로 버리므로 바뀐 게 있을 때만, 확인을 받고 한다
  function revertJournalForm() {
    if (!journalDirty) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm('작성 중인 내용을 저장된 상태로 되돌릴까요?')
    ) {
      return;
    }
    setJournalForm(journalFormFromEntry(journalEntry));
  }

  function useSchedulesInJournal() {
    if (!canEdit) return;
    const text = buildScheduleText(daySchedules);
    if (!text) return;
    setJournalForm(prev => ({
      ...prev,
      report: prev.report?.trim() ? `${prev.report.trim()}\n\n${text}` : text,
    }));
  }

  async function saveJournalEntry() {
    if (!canEdit || saving || savingRef.current) return;
    if (!journalEntry && !hasJournalText(journalForm)) {
      showToast('저장할 일지 내용을 입력해주세요', 'warn');
      return;
    }
    // Ctrl+S를 눌러도 바뀐 게 없으면 다시 쓰지 않는다(서버 동기화·토스트 반복 방지)
    if (journalEntry && !journalDirty) {
      showToast('이미 저장된 상태입니다', 'ok');
      return;
    }
    // 제목·분류·태그는 기존 일지 값을 지킨다(PDF 미리보기 buildJournalNoteFromForm과 같은 규칙)
    const title = journalEntry?.title || `${date} 연구일지`;
    const payload = {
      title,
      menuName: journalEntry?.menuName || title,
      testDate: date,
      category: journalEntry?.category || '기타',
      noteType: JOURNAL_NOTE_TYPE,
      status: journalEntry?.status || NOTE_STATUS.TEST,
      // 본문은 testContent 한 칸 — 예전 보조 칸 내용은 report에 이미 합쳐져 있어 비운다
      ...journalContentFields(journalForm),
      tags: journalEntry?.tags || '연구일지',
      photos: Array.isArray(journalForm.photos) ? journalForm.photos : [],
    };
    const createdId = createdRef.current.date === date ? createdRef.current.id : null;
    const targetId = journalEntry?.id ?? createdId;
    savingRef.current = true;
    setSaving(true);
    try {
      if (targetId != null) await updateNote(targetId, payload);
      else createdRef.current = { date, id: await addNote(payload) };
      showToast('연구일지를 저장했습니다', 'ok');
      reloadNotes();
    } catch (error) {
      console.error('[note/journal] save failed', error);
      showToast('연구일지 저장 실패', 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return {
    journalForm,
    saving,
    journalDirty,
    currentJournalPrintNote,
    updateJournalForm,
    revertJournalForm,
    useSchedulesInJournal,
    saveJournalEntry,
  };
}
