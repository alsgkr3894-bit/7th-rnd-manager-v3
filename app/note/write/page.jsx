'use client';
/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { addNote, getNoteById, CATEGORIES } from '@/lib/note';
import { NoteFormBody, INIT, normalizeNoteFormForSave } from '@/app/note/_NoteFormBody';
import { saveDraft, loadDraft, clearDraft } from '@/lib/note/storage';
import { KEYS, consumeNoteFrom, consumeHomeNoteDraft } from '@/lib/note/keys';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { getActiveBrandId } from '@/lib/active-brand';
import { todayLocalDate } from '@/lib/date/local-date';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentRole } from '@/hooks/useCurrentRole';

function normalizeNoteCategory(value) {
  return CATEGORIES.includes(value) ? value : CATEGORIES[0];
}

export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [form, setForm] = useState(() => ({
    ...INIT,
    testDate: todayLocalDate(),
  }));
  const [saving, setSaving] = useState(false);
  const [fromTitle, setFromTitle] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const timerRef = useRef(null);
  const draftTimer = useRef(null);
  const [lastCategory, setLastCategory, lastCategoryHydrated] = useLocalStorage(
    KEYS.NOTE_LAST_CATEGORY,
    CATEGORIES[0],
    normalizeNoteCategory
  );

  useBeforeUnload(isDirty);

  function handleFormChange(updater) {
    if (!canEdit) return;
    setForm(updater);
    setIsDirty(true);
    isDirtyRef.current = true;
  }

  // 마운트 후 brand·category를 실제 브랜드/저장값으로 교정 (SSR 초기값 'main' 덮기)
  useEffect(() => {
    if (!lastCategoryHydrated) return;
    setForm(f => ({
      ...f,
      brand: getActiveBrandId() || 'main',
      category: lastCategory || f.category,
    }));
  }, [lastCategory, lastCategoryHydrated]);

  useEffect(() => {
    if (!roleReady) return;
    if (!canEdit) return;
    let alive = true;
    const fromId = consumeNoteFrom();
    const homeDraft = consumeHomeNoteDraft(); // note-from-note 분기 시에도 항상 소비 (stale key 방지)
    const sourceNoteId = Number(fromId);
    if (Number.isSafeInteger(sourceNoteId) && sourceNoteId > 0) {
      initDB()
        .then(() => getNoteById(sourceNoteId))
        .then(note => {
          if (!alive || !note) return;
          setFromTitle(note.title);
          setForm(f => ({
            ...f,
            menuName: note.menuName || '',
            category: note.category || f.category,
            noteType: note.noteType || f.noteType,
            tags: note.tags || '',
            parentId: note.id,
            brand: note.brand || f.brand, // 부모 brand 계승
          }));
          setIsDirty(true);
          isDirtyRef.current = true;
        })
        .catch(err => {
          console.error('[note/write] 원본 노트 로드 실패', err);
          showToast('원본 노트를 불러오지 못했습니다. 새 노트로 작성합니다.', 'warn');
        });
    } else {
      if (homeDraft) {
        setForm(f => ({ ...f, title: homeDraft.slice(0, 30), testContent: homeDraft }));
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
  }, [canEdit, form]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (!canEdit) {
      showToast('노트 작성은 관리자만 가능합니다', 'warn');
      return;
    }
    if (saving) return; // Ctrl+S 연타 시 중복 저장(레코드 중복 생성) 방지
    if (!(form.title || form.menuName || '').trim() || !form.testContent.trim()) {
      showToast('제목과 테스트 내용은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    clearTimeout(timerRef.current);
    clearTimeout(draftTimer.current);
    try {
      await initDB();
      await addNote(normalizeNoteFormForSave(form));
      clearDraft(KEYS.NOTE_DRAFT_WRITE);
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
    if (canEdit) clearDraft(KEYS.NOTE_DRAFT_WRITE);
    setIsDirty(false);
    router.push('/note');
  }

  function restoreDraft() {
    if (!canEdit) return;
    const draft = loadDraft(KEYS.NOTE_DRAFT_WRITE);
    if (draft) {
      setForm(f => ({ ...f, ...draft, photos: [] }));
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
      <NoteFormBody form={form} setForm={handleFormChange} onCategoryChange={setLastCategory} />
    </main>
  );
}
