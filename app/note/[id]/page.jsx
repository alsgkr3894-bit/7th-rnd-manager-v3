'use client';
/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getNoteById, updateNote, getNotesInChain, duplicateNote } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { printCurrentPageWithDownloadDate } from '@/lib/download';
import { NoteFormBody, INIT } from '@/app/note/_NoteFormBody';
import { NoteDetailSkeleton } from '@/components/ui/Skeleton';
import { saveDraft, loadDraft, clearDraft } from '@/lib/note/storage';
import { KEYS, setSampleFromNote } from '@/lib/note/keys';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { ChainTimeline } from './detail/ChainTimeline';
import { NoteDetailActions } from './detail/NoteDetailActions';
import { NoteDraftBanner } from './detail/NoteDraftBanner';
import { RelatedSamplesPanel } from './detail/RelatedSamplesPanel';
import {
  findRelatedSamplesForNote,
  hasStoredNoteDraft,
  isNoteFormChanged,
  mergeDraftWithCurrentPhotos,
  normalizeNoteRouteId,
} from './detail/noteDetailUtils';

export default function Page() {
  const router = useRouter();
  const { id } = useParams();
  const noteId = normalizeNoteRouteId(id);

  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chain, setChain] = useState([]);
  const [relatedSamples, setRelatedSamples] = useState([]);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [costMenuOpen, setCostMenuOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const skipRef = useRef(true);
  const originalRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!noteId) {
      router.replace('/note');
      return;
    }
    let alive = true;
    initDB()
      .then(() => Promise.all([getNoteById(noteId), getNotesInChain(noteId), getAllSamples()]))
      .then(([note, ch, allSamples]) => {
        if (!alive) return;
        if (!note) {
          showToast('노트를 찾을 수 없어요', 'warn');
          router.replace('/note');
          return;
        }
        const merged = { ...INIT, ...note };
        setForm(merged);
        originalRef.current = merged;
        setChain(ch);
        setRelatedSamples(findRelatedSamplesForNote(note, allSamples));
        const draft = loadDraft(KEYS.NOTE_DRAFT(noteId));
        if (hasStoredNoteDraft(draft, note)) setShowDraftBanner(true);
      })
      .catch(err => {
        if (alive) console.error('[NoteDetail] load failed', err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [noteId, router]);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (!originalRef.current) return;
    if (!isNoteFormChanged(form, originalRef.current)) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => saveDraft(KEYS.NOTE_DRAFT(noteId), { ...form, photos: [] }),
      800
    );
    return () => clearTimeout(timerRef.current);
  }, [form, noteId]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (saving) return;
    if (!form.title.trim() || !form.testContent.trim()) {
      showToast('제목과 테스트 내용은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    try {
      await updateNote(noteId, form);
      clearDraft(KEYS.NOTE_DRAFT(noteId));
      showToast('노트가 수정됐어요', 'ok');
      router.push('/note');
    } catch {
      showToast('저장 중 오류가 발생했어요', 'error');
      setSaving(false);
    }
  }

  function handleCancel() {
    clearTimeout(timerRef.current);
    clearDraft(KEYS.NOTE_DRAFT(noteId));
    router.push('/note');
  }

  function handleCreateSample() {
    setSampleFromNote({
      menuName: form.menuName,
      category: form.category,
      tags: form.tags,
      noteId,
    });
    router.push('/note/sample/write');
  }

  function handlePrint() {
    printCurrentPageWithDownloadDate(`노트상세_${noteId || '상세'}`);
  }

  function handleCostNavigation(href) {
    router.push(href);
    setCostMenuOpen(false);
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const newId = await duplicateNote(noteId);
      showToast('노트가 복사됐어요', 'ok');
      if (newId) router.push(`/note/${newId}`);
      else router.push('/note');
    } catch {
      showToast('복사 중 오류가 발생했어요', 'error');
    } finally {
      setDuplicating(false);
    }
  }

  function restoreDraft() {
    const draft = loadDraft(KEYS.NOTE_DRAFT(noteId));
    if (draft) {
      setForm(prev => mergeDraftWithCurrentPhotos(draft, prev));
      showToast('임시저장된 내용을 불러왔어요', 'ok');
    }
    setShowDraftBanner(false);
  }

  function ignoreDraft() {
    clearDraft(KEYS.NOTE_DRAFT(noteId));
    setShowDraftBanner(false);
  }

  if (loading) return <NoteDetailSkeleton />;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 수정']}
        title="노트 수정"
        sub={form.title || ''}
        actions={
          <NoteDetailActions
            saving={saving}
            duplicating={duplicating}
            costMenuOpen={costMenuOpen}
            onPrint={handlePrint}
            onDuplicate={handleDuplicate}
            onToggleCostMenu={() => setCostMenuOpen(value => !value)}
            onCloseCostMenu={() => setCostMenuOpen(false)}
            onNavigateCostLink={handleCostNavigation}
            onCreateSample={handleCreateSample}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        }
      />
      {showDraftBanner && <NoteDraftBanner onRestore={restoreDraft} onIgnore={ignoreDraft} />}
      <NoteFormBody form={form} setForm={setForm} />
      <ChainTimeline
        chain={chain}
        currentId={noteId}
        onNavigate={id => router.push(`/note/${id}`)}
      />
      <RelatedSamplesPanel
        samples={relatedSamples}
        menuName={form.menuName}
        onOpenSample={id => router.push(`/note/sample/${id}`)}
      />
    </main>
  );
}
