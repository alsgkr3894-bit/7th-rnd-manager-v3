'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { addNote, getNoteById } from '@/lib/note';
import { NoteFormBody, INIT } from '../_NoteFormBody';

const DRAFT_KEY = 'v3:note-draft-write';

function saveDraft(form) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
}
function loadDraft() {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export default function Page() {
  const router  = useRouter();
  const [form,           setForm]          = useState(() => ({ ...INIT, testDate: new Date().toISOString().slice(0, 10) }));
  const [saving,         setSaving]        = useState(false);
  const [fromTitle,      setFromTitle]     = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const skipRef  = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    let fromId = null;
    try { fromId = sessionStorage.getItem('v3:note-from'); sessionStorage.removeItem('v3:note-from'); } catch {}
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
          }));
        })
        .catch(console.error);
    } else {
      const draft = loadDraft();
      if (draft && (draft.title || draft.menuName || draft.testContent)) {
        setShowDraftBanner(true);
      }
    }
  }, []);

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveDraft(form), 800);
    return () => clearTimeout(timerRef.current);
  }, [form]);

  async function handleSave() {
    if (!form.title.trim() || !form.menuName.trim() || !form.testContent.trim()) {
      showToast('제목, 메뉴명, 테스트 내용은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    try {
      await initDB();
      await addNote(form);
      clearDraft();
      showToast('노트가 저장됐어요', 'ok');
      router.push('/note');
    } catch {
      showToast('저장 중 오류가 발생했어요', 'error');
      setSaving(false);
    }
  }

  function handleCancel() {
    clearDraft();
    router.push('/note');
  }

  function restoreDraft() {
    const draft = loadDraft();
    if (draft) { setForm(draft); showToast('임시저장된 내용을 불러왔어요', 'ok'); }
    setShowDraftBanner(false);
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 작성']}
        title="노트 작성"
        sub={fromTitle ? `"${fromTitle}" 기반 새 버전` : '테스트 조건과 평가를 기록하세요'}
        actions={
          <>
            <button className="btn" onClick={handleCancel}>취소</button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </>
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
            <button className="btn sm" onClick={() => { clearDraft(); setShowDraftBanner(false); }}>무시</button>
          </div>
        </div>
      )}
      <NoteFormBody form={form} setForm={setForm} />
    </main>
  );
}
