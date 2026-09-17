/**
 * app/note/journal/useJournalForm.js — 연구일지 작성 폼 상태·저장
 *
 * 폼 값 편집·되돌리기·일정 불러오기와 저장(addNote/updateNote) 처리를 맡는다.
 * viewer는 canEdit=false라 saveJournalEntry가 조용히 종료된다.
 */
'use client';
import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { addNote, updateNote } from '@/lib/note';
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import {
  EMPTY_JOURNAL_FORM,
  buildJournalNoteFromForm,
  hasJournalText,
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

  useEffect(() => {
    setJournalForm(journalFormFromEntry(journalEntry));
  }, [date, dayNotes, journalEntry]);

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

  function updateJournalForm(field, value) {
    setJournalForm(prev => ({ ...prev, [field]: value }));
  }

  function revertJournalForm() {
    setJournalForm(journalFormFromEntry(journalEntry));
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
