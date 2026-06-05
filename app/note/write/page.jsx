'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { addNote, getNoteById } from '@/lib/note';
import { NoteFormBody, INIT } from '@/app/note/_NoteFormBody';
import { saveDraft, loadDraft, clearDraft } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';

export default function Page() {
  const router  = useRouter();
  const [form,           setForm]          = useState(() => ({ ...INIT, testDate: new Date().toISOString().slice(0, 10) }));
  const [saving,         setSaving]        = useState(false);
  const [fromTitle,      setFromTitle]     = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftStatus,    setDraftStatus]   = useState('idle'); // idle | saving | saved
  const [isDirty,        setIsDirty]       = useState(false);
  const skipRef    = useRef(true);
  const timerRef   = useRef(null);
  const draftTimer = useRef(null);

  useBeforeUnload(isDirty);

  function handleFormChange(updater) {
    setForm(updater);
    setIsDirty(true);
  }

  useEffect(() => {
    let fromId = null;
    try { fromId = sessionStorage.getItem(KEYS.NOTE_FROM); sessionStorage.removeItem(KEYS.NOTE_FROM); } catch {}
    if (fromId) {
      initDB()
        .then(() => getNoteById(Number(fromId)))
        .then(note => {
          if (!note) return;
          setFromTitle(note.title);
          setForm(f => ({
            ...f,
            menuName: note.menuName || '',
            category: note.category || f.category,
            noteType: note.noteType || f.noteType,
            tags:     note.tags     || '',
            parentId: note.id,
            brand:    note.brand    || f.brand, // 부모 brand 계승
          }));
        })
        .catch(console.error);
    } else {
      const draft = loadDraft(KEYS.NOTE_DRAFT_WRITE);
      if (draft && (draft.title || draft.menuName || draft.testContent)) {
        setShowDraftBanner(true);
      }
    }
  }, []);

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
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
    return () => { clearTimeout(timerRef.current); clearTimeout(draftTimer.current); };
  }, [form]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (saving) return; // Ctrl+S 연타 시 중복 저장(레코드 중복 생성) 방지
    if (!form.title.trim() || !form.menuName.trim() || !form.testContent.trim()) {
      showToast('제목, 메뉴명, 테스트 내용은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    try {
      await initDB();
      await addNote(form);
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
    clearDraft(KEYS.NOTE_DRAFT_WRITE);
    setIsDirty(false);
    router.push('/note');
  }

  function restoreDraft() {
    const draft = loadDraft(KEYS.NOTE_DRAFT_WRITE);
    if (draft) { setForm(draft); showToast('임시저장된 내용을 불러왔어요', 'ok'); }
    setShowDraftBanner(false);
  }

  return (
    <main className="main" aria-busy={saving}>
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 작성']}
        title="노트 작성"
        sub={fromTitle ? `"${fromTitle}" 기반 새 버전` : '테스트 조건과 평가를 기록하세요'}
        actions={
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span aria-live="polite" aria-atomic="true">
              {draftStatus === 'saving' && (
                <span style={{fontSize:12,color:'var(--text-3)'}}>임시저장 중…</span>
              )}
              {draftStatus === 'saved' && (
                <span style={{fontSize:12,color:'var(--positive)',animation:'fade 200ms ease'}}>✓ 임시저장됨</span>
              )}
            </span>
            <button className="btn" onClick={handleCancel}>취소</button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </div>
        }
      />
      {fromTitle && (
        <div style={{
          background:'var(--accent-soft)', color:'var(--accent-text)',
          borderRadius:10, padding:'10px 16px', fontSize:13, marginTop:8,
        }}>
          이전 노트 "<b>{fromTitle}</b>"을 기반으로 새 버전을 작성하고 있습니다.
        </div>
      )}
      {showDraftBanner && !fromTitle && (
        <div style={{
          background:'var(--warn-soft)', color:'var(--warn)',
          borderRadius:10, padding:'10px 16px', fontSize:13, marginTop:8,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <span>이전에 작성하던 임시저장이 있어요.</span>
          <div style={{display:'flex', gap:8}}>
            <button className="btn sm" onClick={restoreDraft}>불러오기</button>
            <button className="btn sm" onClick={() => { clearDraft(KEYS.NOTE_DRAFT_WRITE); setShowDraftBanner(false); }}>무시</button>
          </div>
        </div>
      )}
      <NoteFormBody form={form} setForm={handleFormChange} />
    </main>
  );
}
