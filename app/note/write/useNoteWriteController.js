'use client';

/**
 * app/note/write/useNoteWriteController.js — 노트 작성 화면의 상태·로드·임시저장·저장/취소 로직
 * page.jsx는 이 훅이 반환하는 값만으로 화면을 조립한다.
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  addNote,
  getAllNotesCached,
  updateNoteChainStatus,
  CATEGORIES,
  normalizeNoteCategoryForBrand,
} from '@/lib/note';
import { addSample, SAMPLE_RECORD_TYPES } from '@/lib/sample';
import { INIT, normalizeNoteFormForSave } from '@/app/note/_NoteFormBody';
import { loadDraft, clearDraft } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { getActiveBrandId } from '@/lib/active-brand';
import { todayLocalDate } from '@/lib/date/local-date';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  SAMPLE_RECORD_TYPE_BY_WRITE_TYPE,
  WRITE_TYPES,
  WRITE_TYPE_OPTIONS,
  isMenuWriteType,
  makeSampleInitial,
  noteListTypeHref,
  normalizeStoredNoteCategory,
  withDefaultFirstTestRound,
  writeTypeFromParam,
} from './writeTypes';
import { isNoteFormValid, isSampleFormValid, resolveSampleRecordType } from './noteWriteUtils';
import { useNoteWriteSourceLoad } from './useNoteWriteSourceLoad';
import { useNoteWriteDraftAutosave } from './useNoteWriteDraftAutosave';

export function useNoteWriteController() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [routeTypeParam, setRouteTypeParam] = useState('');
  const [writeType, setWriteType] = useState(WRITE_TYPES.MENU_DEVELOPMENT);
  const [form, setForm] = useState(() =>
    withDefaultFirstTestRound({
      ...INIT,
      testDate: todayLocalDate(),
    })
  );
  const [sampleForm, setSampleForm] = useState(() => makeSampleInitial());
  const [saving, setSaving] = useState(false);
  const [fromTitle, setFromTitle] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const timerRef = useRef(null);
  const draftTimer = useRef(null);
  const initialContextAppliedRef = useRef(false);
  const [lastCategory, setLastCategory, lastCategoryHydrated] = useLocalStorage(
    KEYS.NOTE_LAST_CATEGORY,
    CATEGORIES[0],
    normalizeStoredNoteCategory
  );

  useBeforeUnload(isDirty);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRouteTypeParam(params.get('type') || '');
  }, []);

  useEffect(() => {
    const nextType = writeTypeFromParam(routeTypeParam);
    if (!nextType) return;
    setWriteType(nextType);
    if (isMenuWriteType(nextType)) {
      setForm(prev => ({ ...prev, noteType: nextType }));
      return;
    }
    setSampleForm(prev => ({
      ...prev,
      recordType: SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[nextType] || SAMPLE_RECORD_TYPES.SAMPLE_TEST,
      testDate: prev.testDate || todayLocalDate(),
    }));
  }, [routeTypeParam]);

  function handleFormChange(updater) {
    if (!canEdit) return;
    setForm(updater);
    setIsDirty(true);
    isDirtyRef.current = true;
  }

  function handleSampleFormChange(updater) {
    if (!canEdit) return;
    setSampleForm(updater);
    setIsDirty(true);
    isDirtyRef.current = true;
  }

  function handleWriteTypeChange(nextType) {
    if (!WRITE_TYPE_OPTIONS.includes(nextType) || nextType === writeType) return;
    setWriteType(nextType);
    setIsDirty(true);
    isDirtyRef.current = true;

    if (isMenuWriteType(nextType)) {
      setForm(prev => ({ ...prev, noteType: nextType }));
      return;
    }

    setSampleForm(prev => ({
      ...prev,
      recordType: SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[nextType] || SAMPLE_RECORD_TYPES.SAMPLE_TEST,
      testDate: prev.testDate || form.testDate || todayLocalDate(),
    }));
  }

  // 마운트 후 brand·category를 실제 브랜드/저장값으로 교정 (SSR 초기값 'main' 덮기)
  useEffect(() => {
    if (!lastCategoryHydrated) return;
    if (initialContextAppliedRef.current) return;
    initialContextAppliedRef.current = true;
    const activeBrand = getActiveBrandId() || 'main';
    setForm(f => ({
      ...f,
      brand: activeBrand,
      category: normalizeNoteCategoryForBrand(
        isDirtyRef.current ? f.category : lastCategory || f.category,
        activeBrand
      ),
    }));
  }, [lastCategory, lastCategoryHydrated]);

  useNoteWriteSourceLoad({
    canEdit,
    roleReady,
    setWriteType,
    setFromTitle,
    setSampleForm,
    setForm,
    setIsDirty,
    isDirtyRef,
    setShowDraftBanner,
  });

  useNoteWriteDraftAutosave({
    canEdit,
    form,
    writeType,
    isDirtyRef,
    timerRef,
    draftTimer,
    setDraftStatus,
  });

  async function handleSave() {
    if (!canEdit) {
      showToast('노트 작성은 관리자만 가능합니다', 'warn');
      return;
    }
    if (saving) return; // Ctrl+S 연타 시 중복 저장(레코드 중복 생성) 방지
    if (!isMenuWriteType(writeType)) {
      if (!isSampleFormValid(sampleForm)) {
        showToast('제목은 필수입니다', 'warn');
        return;
      }
      setSaving(true);
      try {
        await initDB();
        const recordType = resolveSampleRecordType(
          sampleForm,
          SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType]
        );
        await addSample({
          ...sampleForm,
          recordType,
        });
        isDirtyRef.current = false;
        setIsDirty(false);
        showToast('기록이 저장됐어요', 'ok');
        router.replace(noteListTypeHref(recordType));
      } catch {
        showToast('저장 중 오류가 발생했어요', 'error');
        setSaving(false);
      }
      return;
    }
    if (!isNoteFormValid(form)) {
      showToast('제목과 테스트 내용은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    clearTimeout(timerRef.current);
    clearTimeout(draftTimer.current);
    try {
      await initDB();
      const existingNotes = await getAllNotesCached();
      const payload = normalizeNoteFormForSave(form, { existingNotes });
      const noteId = await addNote(payload);
      await updateNoteChainStatus(noteId, payload.status);
      clearDraft(KEYS.NOTE_DRAFT_WRITE);
      isDirtyRef.current = false;
      setIsDirty(false);
      showToast('노트가 저장됐어요', 'ok');
      router.replace('/note');
    } catch {
      showToast('저장 중 오류가 발생했어요', 'error');
      setSaving(false);
    }
  }

  useKeyboardSave(handleSave);

  function handleCancel() {
    clearTimeout(timerRef.current);
    clearTimeout(draftTimer.current);
    isDirtyRef.current = false;
    if (canEdit && isMenuWriteType(writeType)) clearDraft(KEYS.NOTE_DRAFT_WRITE);
    setIsDirty(false);
    // 저장(replace)과 동일하게 replace를 써야 취소 후 "뒤로가기"가 다시 이 작성
    // 화면으로 돌아오지 않는다(push였을 때 취소해도 히스토리에 남아 뒤로가기가
    // 어색했던 문제).
    router.replace(
      isMenuWriteType(writeType)
        ? '/note'
        : noteListTypeHref(
            resolveSampleRecordType(sampleForm, SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType])
          )
    );
  }

  function restoreDraft() {
    if (!canEdit) return;
    const draft = loadDraft(KEYS.NOTE_DRAFT_WRITE);
    if (draft) {
      if (isMenuWriteType(draft.noteType)) setWriteType(draft.noteType);
      setForm(f => withDefaultFirstTestRound({ ...f, ...draft, photos: [] }));
      setIsDirty(true);
      isDirtyRef.current = true;
      showToast('임시저장된 내용을 불러왔어요', 'ok');
    }
    setShowDraftBanner(false);
  }

  function dismissDraftBanner() {
    if (canEdit) clearDraft(KEYS.NOTE_DRAFT_WRITE);
    setShowDraftBanner(false);
  }

  return {
    canEdit,
    writeType,
    form,
    sampleForm,
    saving,
    fromTitle,
    showDraftBanner,
    draftStatus,
    setLastCategory,
    handleFormChange,
    handleSampleFormChange,
    handleWriteTypeChange,
    handleSave,
    handleCancel,
    restoreDraft,
    dismissDraftBanner,
  };
}
