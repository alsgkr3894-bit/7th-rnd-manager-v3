'use client';
/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegGroup } from '@/components/note/FormFields';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  addNote,
  getAllNotesCached,
  getNoteById,
  updateNoteChainStatus,
  CATEGORIES,
  normalizeNoteCategoryForBrand,
} from '@/lib/note';
import {
  addSample,
  buildNextSampleRoundDraft,
  getSampleById,
  LEGACY_SAMPLE_RECORD_TYPES,
  SAMPLE_RECORD_TYPES,
} from '@/lib/sample';
import { buildPreviousRoundDraft } from '@/lib/note/evaluation';
import { NoteFormBody, INIT, normalizeNoteFormForSave } from '@/app/note/_NoteFormBody';
import { SampleFormBody, SAMPLE_INIT } from '@/app/note/sample/_SampleFormBody';
import { saveDraft, loadDraft, clearDraft } from '@/lib/note/storage';
import {
  KEYS,
  consumeNoteFrom,
  consumeHomeNoteDraft,
  consumeSampleFrom,
  consumeSampleFromNote,
} from '@/lib/note/keys';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { getActiveBrandId } from '@/lib/active-brand';
import { todayLocalDate } from '@/lib/date/local-date';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentRole } from '@/hooks/useCurrentRole';

function normalizeStoredNoteCategory(value) {
  return CATEGORIES.includes(value) || value === '메뉴' ? value : CATEGORIES[0];
}

const DEFAULT_FIRST_TEST_ROUND = '1';
const WRITE_TYPES = {
  MENU_DEVELOPMENT: '메뉴개발',
  MENU_IMPROVEMENT: '메뉴개선',
  SAMPLE_TEST: '샘플테스트',
  PRODUCT_ISSUE: '제품이슈',
};
const WRITE_TYPE_OPTIONS = [
  WRITE_TYPES.MENU_DEVELOPMENT,
  WRITE_TYPES.MENU_IMPROVEMENT,
  WRITE_TYPES.SAMPLE_TEST,
  WRITE_TYPES.PRODUCT_ISSUE,
];
const SAMPLE_RECORD_TYPE_BY_WRITE_TYPE = {
  [WRITE_TYPES.SAMPLE_TEST]: SAMPLE_RECORD_TYPES.SAMPLE_TEST,
  [WRITE_TYPES.PRODUCT_ISSUE]: SAMPLE_RECORD_TYPES.ISSUE,
};
const WRITE_TYPE_PARAM_MAP = {
  'menu-development': WRITE_TYPES.MENU_DEVELOPMENT,
  development: WRITE_TYPES.MENU_DEVELOPMENT,
  menu: WRITE_TYPES.MENU_DEVELOPMENT,
  'menu-improvement': WRITE_TYPES.MENU_IMPROVEMENT,
  improvement: WRITE_TYPES.MENU_IMPROVEMENT,
  sample: WRITE_TYPES.SAMPLE_TEST,
  'sample-test': WRITE_TYPES.SAMPLE_TEST,
  issue: WRITE_TYPES.PRODUCT_ISSUE,
  'product-issue': WRITE_TYPES.PRODUCT_ISSUE,
};

function isMenuWriteType(value) {
  return value === WRITE_TYPES.MENU_DEVELOPMENT || value === WRITE_TYPES.MENU_IMPROVEMENT;
}

function writeTypeFromParam(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  return WRITE_TYPE_PARAM_MAP[key] || null;
}

function writeTypeFromSample(sample) {
  return sample?.recordType === SAMPLE_RECORD_TYPES.ISSUE ||
    sample?.recordType === LEGACY_SAMPLE_RECORD_TYPES.ISSUE
    ? WRITE_TYPES.PRODUCT_ISSUE
    : WRITE_TYPES.SAMPLE_TEST;
}

function noteListTypeHref(recordType) {
  return `/note?type=${encodeURIComponent(recordType || SAMPLE_RECORD_TYPES.SAMPLE_TEST)}`;
}

function withDefaultFirstTestRound(value = {}) {
  const testRound = String(value.testRound || '').trim() || DEFAULT_FIRST_TEST_ROUND;
  return { ...value, testRound };
}

function makeSampleInitial(writeType = WRITE_TYPES.SAMPLE_TEST) {
  return {
    ...SAMPLE_INIT,
    recordType: SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType] || SAMPLE_RECORD_TYPES.SAMPLE_TEST,
    testDate: todayLocalDate(),
  };
}

function WriteTypeStep({ value, onChange, disabled = false }) {
  const descriptions = {
    [WRITE_TYPES.MENU_DEVELOPMENT]: '신규 메뉴 개발 노트를 작성합니다.',
    [WRITE_TYPES.MENU_IMPROVEMENT]: '기존 메뉴 개선과 차수 테스트를 기록합니다.',
    [WRITE_TYPES.SAMPLE_TEST]: '식자재 샘플 테스트 기록 양식으로 작성합니다.',
    [WRITE_TYPES.PRODUCT_ISSUE]: '제품 변경, 불량, 대체 등 식자재 이슈 양식으로 작성합니다.',
  };

  return (
    <section className="card" style={{ padding: 20, marginTop: 16 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>
            작성 유형 선택
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            먼저 기록 유형을 선택하면 그 유형에 맞는 작성 양식이 열립니다.
          </div>
        </div>
        <SegGroup
          options={WRITE_TYPE_OPTIONS}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>
          {descriptions[value]}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
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
  }, [canEdit, roleReady]);

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
  }, [canEdit, form, writeType]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (!canEdit) {
      showToast('노트 작성은 관리자만 가능합니다', 'warn');
      return;
    }
    if (saving) return; // Ctrl+S 연타 시 중복 저장(레코드 중복 생성) 방지
    if (!isMenuWriteType(writeType)) {
      if (!sampleForm.title.trim()) {
        showToast('제목은 필수입니다', 'warn');
        return;
      }
      setSaving(true);
      try {
        await initDB();
        const recordType =
          sampleForm.recordType ||
          SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType] ||
          SAMPLE_RECORD_TYPES.SAMPLE_TEST;
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
    if (!(form.title || form.menuName || form.menuCode || '').trim() || !form.testContent.trim()) {
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

  function handleCancel() {
    clearTimeout(timerRef.current);
    clearTimeout(draftTimer.current);
    isDirtyRef.current = false;
    if (canEdit && isMenuWriteType(writeType)) clearDraft(KEYS.NOTE_DRAFT_WRITE);
    setIsDirty(false);
    router.push(
      isMenuWriteType(writeType)
        ? '/note'
        : noteListTypeHref(
            sampleForm.recordType ||
              SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType] ||
              SAMPLE_RECORD_TYPES.SAMPLE_TEST
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

  return (
    <main className="main" aria-busy={saving}>
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 작성']}
        title="노트 작성"
        sub={fromTitle ? `"${fromTitle}" 기반 새 버전` : '테스트 조건과 평가를 기록하세요'}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span aria-live="polite" aria-atomic="true">
              {draftStatus === 'saving' && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>임시저장 중…</span>
              )}
              {draftStatus === 'saved' && (
                <span
                  style={{ fontSize: 12, color: 'var(--positive)', animation: 'fade 200ms ease' }}
                >
                  ✓ 임시저장됨
                </span>
              )}
            </span>
            <button className="btn" onClick={handleCancel}>
              취소
            </button>
            <button className="btn primary" onClick={handleSave} disabled={saving || !canEdit}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </div>
        }
      />
      <WriteTypeStep value={writeType} onChange={handleWriteTypeChange} disabled={!canEdit} />
      {fromTitle && (
        <div
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            marginTop: 8,
          }}
        >
          이전 노트 "<b>{fromTitle}</b>"을 기반으로 새 버전을 작성하고 있습니다.
        </div>
      )}
      {canEdit && showDraftBanner && !fromTitle && (
        <div
          style={{
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>이전에 작성하던 임시저장이 있어요.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={restoreDraft}>
              불러오기
            </button>
            <button
              className="btn sm"
              onClick={() => {
                if (canEdit) clearDraft(KEYS.NOTE_DRAFT_WRITE);
                setShowDraftBanner(false);
              }}
            >
              무시
            </button>
          </div>
        </div>
      )}
      {isMenuWriteType(writeType) ? (
        <NoteFormBody form={form} setForm={handleFormChange} onCategoryChange={setLastCategory} />
      ) : (
        <SampleFormBody form={sampleForm} setForm={handleSampleFormChange} readOnly={!canEdit} />
      )}
    </main>
  );
}
