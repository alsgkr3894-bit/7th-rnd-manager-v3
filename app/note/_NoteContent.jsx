'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { NoteCardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB, restoreRecord } from '@/lib/db';
import {
  CATEGORIES, NOTE_TYPES, STATUSES, STATUS_COLORS, STATUS_BORDER,
  getAllNotes, addNote, deleteNote, updateNote,
} from '@/lib/note';
import { NOTE_STATUS } from '@/lib/note/constants';
import { getNoteDetailStats } from '@/lib/stats/note-stats';
import { tryLS, setLS } from '@/lib/note/storage';
import { downloadCsv } from '@/lib/download';
import { KEYS } from '@/lib/note/keys';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import { useNoteFilter } from '@/hooks/useNoteFilter';
import { buildHighlightRegex, parseTagList, formatFullDate } from '@/lib/note/utils';
import { NoteCard } from './_NoteCard';
import { NoteDetailModal } from './_NoteDetailModal';
import { NoteBatchToolbar } from './_NoteBatchToolbar';
import { NotePresetBar } from './_NotePresetBar';

const NoteTableRow = React.memo(function NoteTableRow({ note, focusedRow, handleStatusChange, router, handleDelete, setFocusedRow, setDetailNote }) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const isFocused = focusedRow === note.id;
  return (
    <tr
      style={{ cursor: 'pointer', background: isFocused ? 'var(--accent-soft, rgba(99,102,241,.08))' : undefined }}
      onClick={() => { setFocusedRow(note.id); setDetailNote(note); }}>
      <td style={{ fontWeight: 600 }}>
        {note.parentId && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>🔗 체인</span>}
        {note.title}
      </td>
      <td style={{ color: 'var(--text-2)' }}>{note.menuName}</td>
      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{note.category}</td>
      <td>
        <select value={note.status}
          onChange={e => handleStatusChange(note.id, e.target.value, e)}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 12,
            background: sc.bg, color: sc.color,
            border: `1px solid ${sc.color}40`, cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
          }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatFullDate(note.testDate)}</td>
      <td onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn sm" onClick={() => router.push(`/note/${note.id}`)}>
            <Icon.edit style={{ width: 12, height: 12 }} />
          </button>
          <button className="btn sm" style={{ color: 'var(--negative)' }}
            onClick={e => handleDelete(note, e)}>
            <Icon.trash style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </td>
    </tr>
  );
});

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate',  label: '날짜순' },
  { key: 'menuName',  label: '메뉴명순' },
];

export function NoteContent() {
  const router       = useRouter();
  const pathname     = usePathname();

  const [notes,        setNotes]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [viewMode,     setViewMode]     = useState(() => tryLS(KEYS.NOTE_VIEW, 'card'));
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailNote,   setDetailNote]   = useState(null);
  const [stats,        setStats]        = useState(null);
  const [batchMode,    setBatchMode]    = useState(false);
  const [selected,     setSelected]     = useState(new Set());
  const [popIds,       setPopIds]       = useState(new Set());
  const [deletingIds,  setDeletingIds]  = useState(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmDeletePreset, setConfirmDeletePreset] = useState(null);
  const [singleDeleteNote, setSingleDeleteNote] = useState(null);
  const [presets,      setPresets]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEYS.NOTE_PRESETS) || '[]'); } catch { return []; }
  });
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEYS.NOTE_PINS) || '[]')); } catch { return new Set(); }
  });

  useScrollMemory(pathname);

  // 검색/상태필터/정렬 상태 + 파생 데이터(counts·filtered)는 useNoteFilter로 위임
  const {
    search, setSearch, statusFilter, setStatusFilter, sortBy, setSortBy,
    counts, filtered,
  } = useNoteFilter(notes, pinnedIds, { pathname });

  const {
    history: searchHistory,
    isOpen:  showSearchHist,
    setIsOpen: setShowSearchHist,
    add:     saveSearchHistory,
    scheduleAdd: scheduleSearchHistory,
    cancelScheduled: cancelSearchHistory,
  } = useSearchHistory(KEYS.NOTE_SEARCH_HISTORY);

  const [ctxMenu,    setCtxMenu]    = useState(null);
  const [focusedRow, setFocusedRow] = useState(null);

  const load = useCallback(async () => {
    await initDB();
    const [data, s] = await Promise.all([getAllNotes(), getNoteDetailStats()]);
    setNotes(data);
    setStats(s);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = e => { if (e.key === 'Escape') setCtxMenu(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctxMenu]);

  const hlRe = useMemo(() => buildHighlightRegex(search.trim()), [search]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  function togglePin(noteId, e) {
    e?.stopPropagation();
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      try { localStorage.setItem(KEYS.NOTE_PINS, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function exportCsv() {
    const cols = ['id','title','menuName','category','noteType','status','testDate','testContent','createdAt','임시원가합계','임시원가재료수'];
    const dataRows = filtered.map(n => [
      ...['id','title','menuName','category','noteType','status','testDate','testContent','createdAt'].map(k => n[k] != null ? String(n[k]) : ''),
      n.tempCostCalc?.totalCost    != null ? String(n.tempCostCalc.totalCost)              : '',
      n.tempCostCalc?.ingredients  != null ? String(n.tempCostCalc.ingredients.length)     : '',
    ]);
    downloadCsv([cols, ...dataRows], `notes_${new Date().toISOString().slice(0,10)}.csv`);
    showToast(`CSV ${filtered.length}개 내보내기 완료`, 'ok');
  }

  function handleSearchChange(val) {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
    scheduleSearchHistory(val);
  }

  const handleDelete = useCallback(function handleDelete(note, e) {
    e?.stopPropagation();
    setSingleDeleteNote(note);
  }, []);

  async function execDelete(note) {
    setSingleDeleteNote(null);
    try {
      // deleteNote가 삭제된 부모+자식 원본 레코드 배열을 반환 → 전부 복원해야 자식 유실 방지
      const removed = await deleteNote(note.id);
      setNotes(prev => prev.filter(n => n.id !== note.id));
      if (detailNote?.id === note.id) setDetailNote(null);
      const childCount = (removed?.length ?? 1) - 1;
      const base = note.title?.trim() ? `"${note.title}" 삭제됨` : '노트 삭제됨';
      const label = childCount > 0 ? `${base} (하위 ${childCount}개 포함)` : base;
      showToast(label, 'ok', 5000, {
        label: '실행취소',
        onClick: async () => {
          for (const rec of removed || []) {
            await restoreRecord('menu_dev_notes', rec).catch(() => {});
          }
          load();
        },
      });
    } catch (err) {
      console.error('[NoteContent] deleteNote', err);
      showToast('삭제 실패', 'error');
    }
  }

  async function handleCopy(note, e) {
    e.stopPropagation();
    try {
      await initDB();
      await addNote({ ...note, title: `${note.title} (복사)`, createdAt: undefined, parentId: null });
      showToast('노트를 복사했어요', 'ok');
      load();
    } catch (err) { console.error('[NoteContent] handleCopy', err); showToast('복사 실패', 'error'); }
  }

  const handleStatusChange = useCallback(async function handleStatusChange(noteId, newStatus, e) {
    e.stopPropagation();
    try {
      await updateNote(noteId, { status: newStatus });
      showToast(`상태 → ${newStatus}`, 'ok');
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, status: newStatus } : n));
      setPopIds(s => new Set([...s, noteId]));
      setTimeout(() => setPopIds(s => { const n = new Set(s); n.delete(noteId); return n; }), 400);
      setDetailNote(n => n?.id === noteId ? { ...n, status: newStatus } : n);
    } catch (err) { console.error('[NoteContent] handleStatusChange', err); showToast('상태 변경 실패', 'error'); }
  }, []);

  function handleBatchDelete() {
    if (selected.size === 0) return;
    setConfirmBatch(true);
  }

  async function handleBatchStatusChange(newStatus) {
    if (selected.size === 0) return;
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => updateNote(id, { status: newStatus })));
      setNotes(prev => prev.map(n => ids.includes(n.id) ? { ...n, status: newStatus } : n));
      showToast(`${ids.length}개 → ${newStatus}`, 'ok');
      setSelected(new Set());
      setBatchMode(false);
    } catch (err) { console.error('[NoteContent] handleBatchStatusChange', err); showToast('상태 변경 실패', 'error'); }
  }

  async function confirmBatchDelete() {
    setConfirmBatch(false);
    const ids = [...selected];
    setSelected(new Set());
    setBatchMode(false);
    try {
      const CHUNK = 10;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await Promise.all(ids.slice(i, i + CHUNK).map(id => deleteNote(id)));
      }
      setNotes(prev => prev.filter(n => !ids.includes(n.id)));
      showToast(`${ids.length}개 삭제됨`, 'ok');
    } catch (err) {
      console.error('[NoteContent] confirmBatchDelete', err);
      showToast('일부 삭제 실패', 'error');
      load();
    }
  }

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleNewVersion(note, e) {
    e.stopPropagation();
    try { sessionStorage.setItem(KEYS.NOTE_FROM, String(note.id)); } catch {}
    router.push('/note/write');
  }

  async function handleBulkCopy() {
    const targets = notes.filter(n => n.status === NOTE_STATUS.REPORTING);
    if (!targets.length) { showToast('보고예정 노트가 없어요', 'warn'); return; }
    const text = targets.map(n => `[${n.menuName}] ${n.title}
테스트 내용: ${n.testContent || '—'}
맛 평가: ${n.tasteEval || '—'}
상무님 평가: ${n.managerEval || '—'}
다음 액션: ${n.nextAction || '—'}
보고용 요약: ${n.reportSummary || '—'}`).join('\n\n─────────────────\n\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(`보고예정 ${targets.length}개 복사 완료`, 'ok');
    } catch { showToast('복사 실패', 'warn'); }
  }

  function changeSort(key) { setSortBy(key); setVisibleCount(PAGE_SIZE); }  // sortBy 영속은 useNoteFilter가 담당
  function changeView(mode) { setViewMode(mode); setLS(KEYS.NOTE_VIEW, mode); }

  function savePreset(name) {
    const next = [...presets, { name, status: statusFilter, search, sort: sortBy }];
    setPresets(next);
    try { localStorage.setItem(KEYS.NOTE_PRESETS, JSON.stringify(next)); } catch {}
    showToast(`"${name}" 프리셋 저장됨`, 'ok');
  }

  function applyPreset(p) {
    setStatusFilter(p.status);
    setSearch(p.search || '');
    setSortBy(p.sort);  // 영속은 useNoteFilter가 담당
  }

  function deletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next);
    try { localStorage.setItem(KEYS.NOTE_PRESETS, JSON.stringify(next)); } catch {}
  }

  const hasActiveFilter = statusFilter !== 'all' || search.trim() || sortBy !== 'createdAt';

  return (
    <main className="main page-enter">
      <ConfirmDialog
        open={confirmBatch}
        title={`노트 ${selected.size}개를 삭제할까요?`}
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제" cancelLabel="취소" danger
        onConfirm={confirmBatchDelete}
        onCancel={() => setConfirmBatch(false)}
      />
      <ConfirmDialog
        open={confirmDeletePreset !== null}
        title="프리셋을 삭제할까요?"
        message={`"${presets[confirmDeletePreset]?.name}" 프리셋이 삭제됩니다.`}
        confirmLabel="삭제" cancelLabel="취소" danger
        onConfirm={() => { deletePreset(confirmDeletePreset); setConfirmDeletePreset(null); }}
        onCancel={() => setConfirmDeletePreset(null)}
      />
      <ConfirmDialog
        open={singleDeleteNote !== null}
        title="노트를 삭제할까요?"
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제" cancelLabel="취소" danger
        onConfirm={() => execDelete(singleDeleteNote)}
        onCancel={() => setSingleDeleteNote(null)}
      />
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 목록']}
        title="메뉴개발노트"
        sub={`전체 ${notes.length}개`}
        actions={
          <div style={{display:'flex',gap:8}}>
            {batchMode ? (
              <NoteBatchToolbar
                selected={selected}
                onStatusChange={handleBatchStatusChange}
                onDelete={handleBatchDelete}
                onExit={() => { setBatchMode(false); setSelected(new Set()); }}
              />
            ) : (
              <>
                {counts[NOTE_STATUS.REPORTING] > 0 && (
                  <button className="btn" onClick={handleBulkCopy}
                    style={{color:'var(--color-reporting)', borderColor:'var(--color-reporting-dim, #6B3FCB40)'}}>
                    <Icon.doc style={{width:13,height:13}}/> 보고예정 일괄복사
                  </button>
                )}
                <button className="btn" onClick={exportCsv} style={{color:'var(--text-2)'}}>CSV 내보내기</button>
                <button className="btn" onClick={() => setBatchMode(true)}>선택</button>
                <button className="btn" onClick={() => router.push('/note/calendar')}>달력 뷰</button>
                <button className="btn" onClick={() => router.push('/note/board')}>칸반 보드</button>
                <button className="btn primary" onClick={() => router.push('/note/write')}>
                  <Icon.plus style={{width:14,height:14}}/> 노트 작성
                </button>
              </>
            )}
          </div>
        }
      />

      {/* 통계 카드 */}
      {stats && (
        <div className="stat-row" style={{marginTop:8}}>
          <div className="stat-card">
            <div className="stat-label">전체 노트</div>
            <div className="stat-value">{stats.total}<span className="unit">개</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">이번 달 작성</div>
            <div className="stat-value">{stats.thisMonth}<span className="unit">개</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">보고예정</div>
            <div className="stat-value" style={{color:'var(--color-reporting)'}}>{counts[NOTE_STATUS.REPORTING] || 0}<span className="unit">개</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">출시 전환율</div>
            <div className="stat-value" style={{color:'var(--positive)'}}>{stats.releaseRate}<span className="unit">%</span></div>
          </div>
          {stats.monthly && (
            <div className="stat-card" style={{flex:'2 1 200px'}}>
              <div className="stat-label" style={{marginBottom:8}}>최근 6개월</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:4,height:36}}>
                {stats.monthly.map(m => {
                  const max = Math.max(...stats.monthly.map(x => x.count), 1);
                  const h = Math.max(4, Math.round(m.count / max * 36));
                  return (
                    <div key={m.label} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2}}>
                      <div style={{width:'100%', height:h, borderRadius:3, background: m.count ? 'var(--accent)' : 'var(--border)', opacity: m.count ? 1 : .4}}/>
                      <span style={{fontSize:9,color:'var(--text-4)'}}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 상태 칩 필터 */}
      <div className="motion-stagger" style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12,alignItems:'center'}}>
        <button className={'chip' + (statusFilter === 'all' ? ' active' : '')}
          onClick={() => { setStatusFilter('all'); setVisibleCount(PAGE_SIZE); }}>
          전체 <span style={{fontSize:11,opacity:.7}}>{counts.all}</span>
        </button>
        {STATUSES.map(st => (
          <button key={st}
            className={'chip' + (statusFilter === st ? ' active' : '')}
            onClick={() => { setStatusFilter(st); setVisibleCount(PAGE_SIZE); }}
            style={statusFilter !== st && counts[st] > 0 ? { borderColor: STATUS_BORDER[st], color: STATUS_COLORS[st].color } : {}}>
            {st} <span style={{fontSize:11,opacity:.7}}>{counts[st]}</span>
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          {SORT_OPTIONS.map(o => (
            <button key={o.key} className={'chip' + (sortBy === o.key ? ' active' : '')}
              onClick={() => changeSort(o.key)} style={{fontSize:11}}>{o.label}</button>
          ))}
          <div style={{width:1,height:16,background:'var(--border)',margin:'0 2px'}}/>
          <button className={'chip' + (viewMode === 'card' ? ' active' : '')} onClick={() => changeView('card')} title="카드 뷰">
            <Icon.box style={{width:12,height:12}}/>
          </button>
          <button className={'chip' + (viewMode === 'table' ? ' active' : '')} onClick={() => changeView('table')} title="테이블 뷰">
            <Icon.doc style={{width:12,height:12}}/>
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div style={{marginTop:10, position:'relative'}}>
        <div className="filter-search">
          <Icon.search style={{width:15,height:15,color:'var(--text-3)'}}/>
          <input
            placeholder="제목, 메뉴명, 테스트 내용, 태그 검색"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveSearchHistory(search); }}
            onFocus={() => setShowSearchHist(true)}
            onBlur={() => { cancelSearchHistory(); setTimeout(() => setShowSearchHist(false), 150); }}
          />
        </div>
        {showSearchHist && searchHistory.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, boxShadow:'var(--shadow-md)', zIndex:50, overflow:'hidden',
          }}>
            {searchHistory.map((h, i) => (
              <button key={i}
                style={{
                  display:'block', width:'100%', textAlign:'left',
                  padding:'8px 14px', fontSize:13, color:'var(--text-2)',
                  background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                  borderBottom: i < searchHistory.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                onMouseDown={e => { e.preventDefault(); handleSearchChange(h); setShowSearchHist(false); }}>
                <Icon.search style={{width:11,height:11,marginRight:6,opacity:.5}}/>
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 필터 프리셋 */}
      <NotePresetBar
        presets={presets}
        hasActiveFilter={hasActiveFilter}
        onApply={applyPreset}
        onSave={savePreset}
        onDelete={idx => setConfirmDeletePreset(idx)}
      />

      {/* 스켈레톤 로딩 */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16, marginTop:24 }}>
          {Array.from({ length: 6 }).map((_, i) => <NoteCardSkeleton key={i}/>)}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && notes.length === 0 && (
        <div className="empty-state" style={{marginTop:16}}>
          <div className="empty-icon-wrap empty-float">
            <Icon.note style={{width:32,height:32}}/>
          </div>
          <div className="empty-title">아직 노트가 없어요</div>
          <div className="empty-sub">메뉴 테스트 결과나 아이디어를 기록해보세요.</div>
          <button className="btn primary" style={{marginTop:8}} onClick={() => router.push('/note/write')}>
            <Icon.plus style={{width:13,height:13}}/> 첫 노트 작성
          </button>
        </div>
      )}
      {!loading && notes.length > 0 && filtered.length === 0 && (
        <div className="empty-state" style={{marginTop:16}}>
          <div className="empty-icon-wrap">
            <Icon.search style={{width:32,height:32}}/>
          </div>
          <div className="empty-title">
            {search ? `"${search}" 검색 결과가 없어요` : '조건에 맞는 노트가 없어요'}
          </div>
          <div className="empty-sub">필터를 바꾸거나 다른 검색어를 입력해보세요.</div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      {ctxMenu && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:299}} onClick={() => setCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }}/>
          <div className="ctx-menu" style={{
            position:'fixed', left:ctxMenu.x, top:ctxMenu.y, zIndex:300,
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, boxShadow:'var(--shadow-lg)', minWidth:160,
            overflow:'hidden', animation:'fade 120ms ease',
          }}>
            {[
              { label:'수정', action: () => router.push(`/note/${ctxMenu.note.id}`) },
              { label: pinnedIds.has(ctxMenu.note.id) ? '핀 해제' : '핀 고정', action: () => togglePin(ctxMenu.note.id) },
              { label:'복사', action: () => handleCopy(ctxMenu.note, { stopPropagation: () => {} }) },
            ].map(item => (
              <button key={item.label}
                style={{display:'block',width:'100%',textAlign:'left',padding:'9px 14px',fontSize:13,color:'var(--text-1)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',borderBottom:'1px solid var(--border)'}}
                onMouseDown={e => { e.preventDefault(); item.action(); setCtxMenu(null); }}>{item.label}</button>
            ))}
            <div style={{padding:'6px 10px', borderBottom:'1px solid var(--border)'}}>
              <div style={{fontSize:10,color:'var(--text-4)',marginBottom:4,paddingLeft:4}}>상태 변경</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {STATUSES.map(s => (
                  <button key={s}
                    style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:'var(--surface-2)',color:'var(--text-2)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'inherit'}}
                    onMouseDown={e => { e.preventDefault(); handleStatusChange(ctxMenu.note.id, s, { stopPropagation: () => {} }); setCtxMenu(null); }}>{s}</button>
                ))}
              </div>
            </div>
            <button
              style={{display:'block',width:'100%',textAlign:'left',padding:'9px 14px',fontSize:13,color:'var(--negative)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}
              onMouseDown={e => { e.preventDefault(); handleDelete(ctxMenu.note); setCtxMenu(null); }}>삭제</button>
          </div>
        </>
      )}

      {/* 카드 그리드 */}
      {filtered.length > 0 && viewMode === 'card' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16,marginTop:16}}>
            {visible.map((note, i) => (
              <div key={note.id}
                className={'stagger note-card-wrap' + (deletingIds.has(note.id) ? ' note-card-exit' : '')}
                style={{animationDelay:`${Math.min(i,8)*40}ms`}}
                onContextMenu={e => {
                  e.preventDefault();
                  const x = Math.min(e.clientX || 0, window.innerWidth  - 180);
                  const y = Math.min(e.clientY || 0, window.innerHeight - 220);
                  setCtxMenu({ x, y, note });
                }}>
                {note.testContent && note.testContent.length > 80 && (
                  <div className="note-hover-preview">{note.testContent}</div>
                )}
                {batchMode && (
                  <div className={'batch-checkbox-wrap' + (selected.has(note.id) ? ' checked' : '')}
                    onClick={e => { e.stopPropagation(); toggleSelect(note.id); }}>
                    {selected.has(note.id) && <span style={{fontSize:12,fontWeight:800}}>✓</span>}
                  </div>
                )}
                <NoteCard note={note}
                  onEdit={e => { e.stopPropagation(); router.push(`/note/${note.id}`); }}
                  onDelete={e => handleDelete(note, e)}
                  onCopy={e => handleCopy(note, e)}
                  onStatusChange={(s, e) => handleStatusChange(note.id, s, e)}
                  onNewVersion={e => handleNewVersion(note, e)}
                  onClick={() => batchMode ? toggleSelect(note.id) : setDetailNote(note)}
                  hlRe={hlRe}
                  statusPop={popIds.has(note.id)}
                  batchMode={batchMode} selected={selected.has(note.id)}
                  pinned={pinnedIds.has(note.id)} onPin={e => togglePin(note.id, e)}
                  onTagClick={t => { setSearch(t); setShowSearchHist(false); }}
                />
              </div>
            ))}
          </div>
          {visible.length < filtered.length && (
            <button className="load-more-btn" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
              더 보기 ({filtered.length - visible.length}개 남음)
            </button>
          )}
        </>
      )}

      {/* 테이블 뷰 */}
      {filtered.length > 0 && viewMode === 'table' && (
        <div className="card table-card" style={{marginTop:16}}>
          <div style={{overflowX:'auto'}}>
          <table className="data-table stagger-rows" tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedRow(r => {
                  const cur = r == null ? -1 : filtered.findIndex(n => n.id === r);
                  return filtered[Math.min(cur + 1, filtered.length - 1)]?.id ?? r;
                });
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedRow(r => {
                  const cur = r == null ? filtered.length : filtered.findIndex(n => n.id === r);
                  return filtered[Math.max(cur - 1, 0)]?.id ?? r;
                });
              } else if (e.key === 'Enter' && focusedRow != null) {
                const note = filtered.find(n => n.id === focusedRow);
                if (note) setDetailNote(note);
              } else if (e.key === 'Escape') {
                setFocusedRow(null);
              }
            }}>
            <thead style={{position:'sticky', top:0, zIndex:2, background:'var(--surface)'}}>
              <tr>
                <th>제목</th>
                <th style={{width:100}}>메뉴명</th>
                <th style={{width:80}}>카테고리</th>
                <th style={{width:90}}>상태</th>
                <th style={{width:90}}>날짜</th>
                <th style={{width:80}}/>
              </tr>
            </thead>
            <tbody>
              {visible.map(note => (
                <NoteTableRow
                  key={note.id}
                  note={note}
                  focusedRow={focusedRow}
                  handleStatusChange={handleStatusChange}
                  router={router}
                  handleDelete={handleDelete}
                  setFocusedRow={setFocusedRow}
                  setDetailNote={setDetailNote}
                />
              ))}
            </tbody>
          </table>
          </div>
          {visible.length < filtered.length && (
            <button className="load-more-btn" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
              더 보기 ({filtered.length - visible.length}개 남음)
            </button>
          )}
        </div>
      )}

      {detailNote && (
        <NoteDetailModal note={detailNote} onClose={() => setDetailNote(null)}
          onEdit={() => router.push(`/note/${detailNote.id}`)}/>
      )}
    </main>
  );
}
