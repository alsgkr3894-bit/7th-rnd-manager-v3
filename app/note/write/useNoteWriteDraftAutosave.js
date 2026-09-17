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
  useEffect(() => {
    if (!canEdit) return;
    if (!isMenuWriteType(writeType)) return;
    if (!isDirtyRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDraftStatus('saving');
      saveDraft(KEYS.NOTE_DRAFT_WRITE, { ...form, photos: [] });
      clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        setDraftStatus('saved');
        draftTimer.current = setTimeout(() => setDraftStatus('idle'), 2000);
      }, 400);
    }, 800);
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, form, writeType]);
}
