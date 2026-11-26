'use client';

/**
 * app/note/write/useNoteWriteDraftAutosave.js — 메뉴개발노트 폼의 디바운스 임시저장 effect
 * (useNoteWriteController에서 분리)
 */
import { useEffect } from 'react';
import { saveDraft } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { isMenuWriteType } from './writeTypes';

export function useNoteWriteDraftAutosave({
  canEdit,
  form,
  writeType,
  isDirtyRef,
  timerRef,
  draftTimer,
  setDraftStatus,
}) {
  // 실제 저장 결과에 따라 상태를 바꾼다 — 실패는 다시 저장에 성공할 때까지 계속 보여 준다
  function writeDraft() {
    setDraftStatus('saving');
    const stored = saveDraft(KEYS.NOTE_DRAFT_WRITE, { ...form, photos: [] });
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (!stored) {
        setDraftStatus('error');
        return;
      }
      setDraftStatus('saved');
      draftTimer.current = setTimeout(() => setDraftStatus('idle'), 2000);
    }, 400);
  }

  useEffect(() => {
    if (!canEdit) return;
    if (!isMenuWriteType(writeType)) return;
    if (!isDirtyRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(writeDraft, 800);
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, form, writeType]);

  return { retryDraftSave: writeDraft };
}
