'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getNoteById, updateNote, getNotesInChain, STATUS_COLORS, duplicateNote } from '@/lib/note';
import { getAllSamples, sampleNamesOf } from '@/lib/sample';
import { NoteFormBody, INIT } from '@/app/note/_NoteFormBody';
import { NoteDetailSkeleton } from '@/components/ui/Skeleton';
import { saveDraft, loadDraft, clearDraft } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';

const COST_LINKS = [
  { label: '식자재 원가표', href: '/cost/ingredient-price' },
  { label: '메뉴 마스터',   href: '/menu-master' },
  { label: '피자 세부 원가표', href: '/cost/pizza-detail' },
];

function ChainTimeline({ chain, currentId, onNavigate }) {
  if (!chain || chain.length < 2) return null;
  return (
    <div className="card" style={{marginTop:24}}>
      <div className="card-title" style={{marginBottom:12}}>버전 체인</div>
      <div style={{display:'flex', alignItems:'center', overflowX:'auto', paddingBottom:4}}>
        {chain.map((n, i) => {
          const isCurrent = n.id === currentId;
          const sc = STATUS_COLORS[n.status] || {};
          return (
            <div key={n.id} style={{display:'flex', alignItems:'center', flexShrink:0}}>
              {i > 0 && (
                <div style={{width:28, height:2, background:'var(--border)', flexShrink:0}}/>
              )}
              <button
                onClick={() => !isCurrent && onNavigate(n.id)}
                disabled={isCurrent}
                style={{
                  flexShrink:0, minWidth:130, padding:'8px 12px',
                  borderRadius:10,
                  border: isCurrent ? `2px solid ${sc.color || 'var(--accent)'}` : '1px solid var(--border)',
                  background: isCurrent ? (sc.bg || 'var(--accent-soft)') : 'var(--surface)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  textAlign:'left', opacity: isCurrent ? 1 : 0.85,
                }}
              >
                <div style={{fontSize:10, color: sc.color || 'var(--text-3)', fontWeight:700, marginBottom:3, display:'flex', alignItems:'center', gap:4}}>
                  {n.status}
                  {isCurrent && (
                    <span style={{background:'var(--accent)', color:'#fff', borderRadius:4, padding:'0 4px', fontSize:9}}>
                      현재
                    </span>
                  )}
                </div>
                <div style={{fontSize:12, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:150}}>
                  {n.title}
                </div>
                <div style={{fontSize:10, color:'var(--text-3)', marginTop:3}}>
                  {n.testDate || (n.createdAt ? n.createdAt.slice(0, 10) : '')}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  const router  = useRouter();
  const { id }  = useParams();
  const noteId  = id ? Number(id) : null;

  const [form,           setForm]          = useState(INIT);
  const [saving,         setSaving]        = useState(false);
  const [loading,        setLoading]       = useState(true);
  const [chain,          setChain]         = useState([]);
  const [relatedSamples, setRelatedSamples] = useState([]);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [costMenuOpen,   setCostMenuOpen]  = useState(false);
  const [duplicating,    setDuplicating]   = useState(false);

  const skipRef        = useRef(true);
  const originalRef    = useRef(null);
  const timerRef       = useRef(null);

  useEffect(() => {
    if (!noteId) { router.replace('/note'); return; }
    initDB()
      .then(() => Promise.all([getNoteById(noteId), getNotesInChain(noteId), getAllSamples()]))
      .then(([note, ch, allSamples]) => {
        if (!note) { showToast('노트를 찾을 수 없어요', 'warn'); router.replace('/note'); return; }
        const merged = { ...INIT, ...note };
        setForm(merged);
        originalRef.current = merged;
        setChain(ch);
        if (note.menuName) {
          const mn = note.menuName.trim().toLowerCase();
          // 샘플 레코드는 sampleNames 배열을 menuName으로 join(', ')해 저장하므로,
          // 단일 menuName 비교 대신 샘플명 배열 단위로 매칭한다 (멀티 샘플명 누락 방지)
          setRelatedSamples(allSamples.filter(s => sampleNamesOf(s).some(n => n.trim().toLowerCase() === mn)));
        }
        const draft = loadDraft(KEYS.NOTE_DRAFT(noteId));
        if (draft && (draft.title !== note.title || draft.testContent !== note.testContent || draft.managerEval !== note.managerEval)) {
          setShowDraftBanner(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [noteId, router]);

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    if (!originalRef.current) return;
    // 사진(base64 data URL)은 비교에서 제외 — 매 입력마다 수백 KB 직렬화 방지 (draft 저장도 photos:[] 제외)
    const strip = o => ({ ...o, photos: undefined });
    if (JSON.stringify(strip(form)) === JSON.stringify(strip(originalRef.current))) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveDraft(KEYS.NOTE_DRAFT(noteId), { ...form, photos: [] }), 800);
    return () => clearTimeout(timerRef.current);
  }, [form, noteId]);

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (!form.title.trim() || !form.menuName.trim() || !form.testContent.trim()) {
      showToast('제목, 메뉴명, 테스트 내용은 필수입니다', 'warn');
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
    clearDraft(KEYS.NOTE_DRAFT(noteId));
    router.push('/note');
  }

  function handleCreateSample() {
    try {
      sessionStorage.setItem(KEYS.SAMPLE_FROM_NOTE, JSON.stringify({
        menuName: form.menuName,
        category: form.category,
        tags:     form.tags,
        noteId,
      }));
    } catch {}
    router.push('/note/sample/write');
  }

  function handlePrint() { window.print(); }

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
    if (draft) { setForm(draft); showToast('임시저장된 내용을 불러왔어요', 'ok'); }
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
          <>
            <button className="btn no-print" onClick={handlePrint} title="인쇄">🖨</button>
            <button className="btn no-print" onClick={handleDuplicate} disabled={duplicating} title="이 노트 복사">
              {duplicating ? '복사 중…' : '복사'}
            </button>
            <div style={{ position: 'relative' }} className="no-print">
              <button className="btn" onClick={() => setCostMenuOpen(v => !v)}>↗ 원가</button>
              {costMenuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setCostMenuOpen(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                    boxShadow: 'var(--shadow-md)', minWidth: 160, overflow: 'hidden',
                  }}>
                    {COST_LINKS.map(item => (
                      <button key={item.href} className="btn" style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 16px', borderRadius: 0, fontSize: 13,
                      }} onClick={() => { router.push(item.href); setCostMenuOpen(false); }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="btn no-print" onClick={handleCreateSample}>📷 샘플 작성</button>
            <button className="btn no-print" onClick={handleCancel}>취소</button>
            <button className="btn primary no-print" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </>
        }
      />
      {showDraftBanner && (
        <div style={{
          background:'var(--warn-soft)', color:'var(--warn)',
          borderRadius:10, padding:'10px 16px', fontSize:13, marginTop:8,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <span>저장되지 않은 임시저장이 있어요.</span>
          <div style={{display:'flex', gap:8}}>
            <button className="btn sm" onClick={restoreDraft}>불러오기</button>
            <button className="btn sm" onClick={() => { clearDraft(KEYS.NOTE_DRAFT(noteId)); setShowDraftBanner(false); }}>무시</button>
          </div>
        </div>
      )}
      <NoteFormBody form={form} setForm={setForm} />
      <ChainTimeline chain={chain} currentId={noteId} onNavigate={id => router.push(`/note/${id}`)} />
      {relatedSamples.length > 0 && (
        <div className="card" style={{marginTop:24}}>
          <div className="card-title" style={{marginBottom:12}}>
            관련 샘플기록
            <span style={{fontWeight:400, fontSize:12, color:'var(--text-3)', marginLeft:8}}>메뉴명 "{form.menuName}" 일치</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {relatedSamples.map(s => (
              <button
                key={s.id}
                onClick={() => router.push(`/note/sample/${s.id}`)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  background:'var(--surface-2)', border:'1px solid var(--border)',
                  borderRadius:10, padding:'10px 14px', cursor:'pointer', textAlign:'left',
                }}
              >
                {s.photos?.[0] ? (
                  <img src={s.photos[0].data} alt={`${s.menuName || s.title} 샘플 사진`}
                    style={{width:48, height:36, objectFit:'cover', borderRadius:6, flexShrink:0}}/>
                ) : (
                  <div style={{width:48, height:36, borderRadius:6, background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>📷</div>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.title}</div>
                  <div style={{fontSize:11, color:'var(--text-3)', marginTop:2}}>
                    {s.testDate && <span>{s.testDate}</span>}
                    {s.rating > 0 && <span style={{marginLeft:8, color:'var(--star)'}}>{'★'.repeat(s.rating)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
