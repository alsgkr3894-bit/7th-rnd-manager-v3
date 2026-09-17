'use client';

/**
 * app/note/write/useNoteWriteSourceLoad.js — 마운트 시 원본 샘플/노트/홈 임시글에서
 * 폼 초기값을 채워 넣는 로드 effect (useNoteWriteController에서 분리)
 */
import { useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getNoteById } from '@/lib/note';
import { buildPreviousRoundDraft } from '@/lib/note/evaluation';
import { loadDraft } from '@/lib/note/storage';
import {
  KEYS,
  consumeNoteFrom,
  consumeHomeNoteDraft,
  consumeSampleFrom,
  consumeSampleFromNote,
} from '@/lib/note/keys';
import { buildNextSampleRoundDraft, getSampleById } from '@/lib/sample';
import {
  SAMPLE_RECORD_TYPE_BY_WRITE_TYPE,
  WRITE_TYPES,
  isMenuWriteType,
  withDefaultFirstTestRound,
  writeTypeFromSample,
} from './writeTypes';

export function useNoteWriteSourceLoad({
  canEdit,
  roleReady,
  setWriteType,
  setFromTitle,
  setSampleForm,
  setForm,
  setIsDirty,
  isDirtyRef,
  setShowDraftBanner,
}) {
  useEffect(() => {
    if (!roleReady) return;
    if (!canEdit) return;
    let alive = true;
    const fromSampleId = Number(consumeSampleFrom());
    if (Number.isSafeInteger(fromSampleId) && fromSampleId > 0) {
      setWriteType(WRITE_TYPES.SAMPLE_TEST);
      initDB()
        .then(() => getSampleById(fromSampleId))
        .then(sample => {
          if (!alive || !sample) return;
          const nextType = writeTypeFromSample(sample);
          setFromTitle(sample.title || sample.menuName || '');
          setWriteType(nextType);
          setSampleForm(current => ({
            ...buildNextSampleRoundDraft(sample, current),
            recordType:
              SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[nextType] || current.recordType || sample.recordType,
          }));
          setIsDirty(true);
          isDirtyRef.current = true;
        })
        .catch(err => {
          console.error('[note/write] source sample load failed', err);
          showToast('원본 샘플을 불러오지 못했습니다. 새 기록으로 작성합니다.', 'warn');
        });
      return () => {
        alive = false;
      };
    }

    const sampleDraft = consumeSampleFromNote();
    if (sampleDraft && typeof sampleDraft === 'object' && !Array.isArray(sampleDraft)) {
      const menuName = typeof sampleDraft.menuName === 'string' ? sampleDraft.menuName : '';
      const category = typeof sampleDraft.category === 'string' ? sampleDraft.category : '';
      const tags = typeof sampleDraft.tags === 'string' ? sampleDraft.tags : '';
      const linkedNoteId = typeof sampleDraft.noteId === 'number' ? sampleDraft.noteId : null;
      setWriteType(WRITE_TYPES.SAMPLE_TEST);
      setSampleForm(current => ({
        ...current,
        sampleNames: menuName ? [menuName] : current.sampleNames,
        category: category || current.category,
        tags: tags || current.tags,
        ...(linkedNoteId != null && { linkedNoteId }),
      }));
      setIsDirty(true);
      isDirtyRef.current = true;
      return () => {
        alive = false;
      };
    }

    const fromId = consumeNoteFrom();
    const homeDraft = consumeHomeNoteDraft(); // note-from-note 분기 시에도 항상 소비 (stale key 방지)
    const sourceNoteId = Number(fromId);
    if (Number.isSafeInteger(sourceNoteId) && sourceNoteId > 0) {
      initDB()
        .then(() => getNoteById(sourceNoteId))
        .then(note => {
          if (!alive || !note) return;
          setFromTitle(note.title || note.menuName || '');
          if (isMenuWriteType(note.noteType)) setWriteType(note.noteType);
          setForm(f => buildPreviousRoundDraft(note, f));
          setIsDirty(true);
          isDirtyRef.current = true;
        })
        .catch(err => {
          console.error('[note/write] 원본 노트 로드 실패', err);
          showToast('원본 노트를 불러오지 못했습니다. 새 노트로 작성합니다.', 'warn');
        });
    } else {
      if (homeDraft) {
        setForm(f =>
          withDefaultFirstTestRound({ ...f, title: homeDraft.slice(0, 30), testContent: homeDraft })
        );
        setIsDirty(true);
        isDirtyRef.current = true;
      } else {
        const draft = loadDraft(KEYS.NOTE_DRAFT_WRITE);
        if (draft && (draft.title || draft.menuName || draft.testContent)) {
          setShowDraftBanner(true);
        }
      }
    }
    return () => {
      alive = false;
    };
  }, [canEdit, roleReady]); // eslint-disable-line react-hooks/exhaustive-deps
}
