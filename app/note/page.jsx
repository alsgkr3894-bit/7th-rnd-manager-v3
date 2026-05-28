'use client';
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { NoteCardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import {
  CATEGORIES, NOTE_TYPES, STATUSES, STATUS_COLORS, STATUS_BORDER,
  getAllNotes, addNote, deleteNote, updateNote,
} from '@/lib/note';
import { getNoteDetailStats } from '@/lib/stats/note-stats';

function hl(text, re) {
  if (!re || !text) return text;
  const parts = String(text).split(re);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <mark key={i} className="search-hl">{p}</mark>
      : p
  );
}

function buildHlRe(q) {
  if (!q) return null;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escaped})`, 'gi');
}

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate',  label: '날짜순' },
  { key: 'menuName',  label: '메뉴명순' },
];

function tryLS(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function setLS(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

export default function Page() {
  return (
    <Suspense fallback={<main className="main"><div style={{padding:48, textAlign:'center', color:'var(--text-3)'}}>로딩 중…</div></main>}>
      <NoteContent/>
    </Suspense>
  );
}

function NoteContent() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [notes,        setNotes]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState(() => searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [sortBy,       setSortBy]       = useState(() => tryLS('v3:note-sort', 'createdAt'));
  const [viewMode,     setViewMode]     = useState(() => tryLS('v3:note-view', 'card'));
  const [detailNote,   setDetailNote]   = useState(null);
  const [stats,        setStats]        = useState(null);
  const [batchMode,    setBatchMode]    = useState(false);
  const [selected,     setSelected]     = useState(new Set());
  const [popIds,       setPopIds]       = useState(new Set());
  const [deletingIds,  setDeletingIds]  = useState(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmDeletePreset, setConfirmDeletePreset] = useState(null);
  const [presets,      setPresets]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('v3:note-presets') || '[]'); } catch { return []; }
  });
  const [savingPreset,   setSavingPreset]   = useState(false);
  const [presetName,     setPresetName]     = useState('');
  const presetInputRef = useRef(null);

  const load = useCallback(async () => {
    await initDB();
    const [data, s] = await Promise.all([getAllNotes(), getNoteDetailStats()]);
    setNotes(data);
    setStats(s);
  }, []);

  // URL ↔ filter sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (search)            p.set('q', search);
    if (statusFilter !== 'all') p.set('status', statusFilter);
    const qs = p.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    window.history.replaceState(null, '', next);
  }, [search, statusFilter, pathname]);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  const counts = useMemo(() => {
    const m = { all: notes.length };
    for (const s of STATUSES) m[s] = notes.filter(n => n.status === s).length;
    return m;
  }, [notes]);

  const hlRe = useMemo(() => buildHlRe(search.trim()), [search]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? notes : notes.filter(n => n.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(n =>
      (n.title       || '').toLowerCase().includes(q) ||
      (n.menuName    || '').toLowerCase().includes(q) ||
      (n.testContent || '').toLowerCase().includes(q) ||
      (n.tags        || '').toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => {
      if (sortBy === 'menuName') return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
      if (sortBy === 'testDate') return (b.testDate || '').localeCompare(a.testDate || '');
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [notes, statusFilter, search, sortBy]);

  async function handleDelete(note, e) {
    e?.stopPropagation();
    // 퇴장 애니메이션
    setDeletingIds(s => new Set([...s, note.id]));
    await new Promise(r => setTimeout(r, 250));
    setNotes(prev => prev.filter(n => n.id !== note.id));
    setDeletingIds(s => { const n = new Set(s); n.delete(note.id); return n; });
    if (detailNote?.id === note.id) setDetailNote(null);
    let cancelled = false;
    showToast(`"${note.title}" 삭제됨`, 'ok', 4000, {
      label: '실행취소',
      onClick: () => { cancelled = true; load(); },
    });
    await new Promise(r => setTimeout(r, 3800));
    if (!cancelled) {
      try { await deleteNote(note.id); }
      catch { load(); showToast('삭제 실패', 'error'); }
    }
  }

  async function handleCopy(note, e) {
    e.stopPropagation();
    try {
      await initDB();
      await addNote({
        ...note,
        title: `${note.title} (복사)`,
        createdAt: undefined,
        parentId: null,
      });
      showToast('노트를 복사했어요', 'ok');
      load();
    } catch { showToast('복사 실패', 'error'); }
  }

  async function handleStatusChange(noteId, newStatus, e) {
    e.stopPropagation();
    try {
      await updateNote(noteId, { status: newStatus });
      showToast(`상태 → ${newStatus}`, 'ok');
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, status: newStatus } : n));
      setPopIds(s => new Set([...s, noteId]));
      setTimeout(() => setPopIds(s => { const n = new Set(s); n.delete(noteId); return n; }), 400);
      if (detailNote?.id === noteId) setDetailNote(n => n ? { ...n, status: newStatus } : null);
    } catch { showToast('상태 변경 실패', 'error'); }
  }

  function handleBatchDelete() {
    if (selected.size === 0) return;
    setConfirmBatch(true);
  }

  async function confirmBatchDelete() {
    setConfirmBatch(false);
    const ids = [...selected];
    const snapshot = notes.filter(n => ids.includes(n.id));
    setNotes(prev => prev.filter(n => !ids.includes(n.id)));
    setSelected(new Set());
    setBatchMode(false);
    let cancelled = false;
    showToast(`${ids.length}개 삭제됨`, 'ok', 4000, {
      label: '취소',
      onClick: () => { cancelled = true; setNotes(prev => [...snapshot, ...prev].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))); },
    });
    setTimeout(async () => {
      if (cancelled) return;
      try { await Promise.all(ids.map(id => deleteNote(id))); }
      catch { showToast('일부 삭제 실패', 'error'); load(); }
    }, 4000);
  }

  function toggleSelect(id) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function handleNewVersion(note, e) {
    e.stopPropagation();
    try { sessionStorage.setItem('v3:note-from', String(note.id)); } catch {}
    router.push('/note/write');
  }

  async function handleBulkCopy() {
    const targets = notes.filter(n => n.status === '보고예정');
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

  const formatDate = d => d ? d.replace(/-/g, '.') : '';
  const parseTags  = t => (t || '').split(',').map(s => s.trim()).filter(Boolean);

  function changeSort(key) { setSortBy(key); setLS('v3:note-sort', key); }
  function changeView(mode) { setViewMode(mode); setLS('v3:note-view', mode); }

  function savePreset() {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets, { name, status: statusFilter, search, sort: sortBy }];
    setPresets(next);
    try { localStorage.setItem('v3:note-presets', JSON.stringify(next)); } catch {}
    setPresetName('');
    setSavingPreset(false);
    showToast(`"${name}" 프리셋 저장됨`, 'ok');
  }

  function applyPreset(p) {
    setStatusFilter(p.status);
    setSearch(p.search || '');
    setSortBy(p.sort);
    setLS('v3:note-sort', p.sort);
  }

  function deletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next);
    try { localStorage.setItem('v3:note-presets', JSON.stringify(next)); } catch {}
  }

  const hasActiveFilter = statusFilter !== 'all' || search.trim() || sortBy !== 'createdAt';

  return (
    <main className="main">
      <ConfirmDialog
        open={confirmBatch}
        title={`노트 ${selected.size}개를 삭제할까요?`}
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmBatchDelete}
        onCancel={() => setConfirmBatch(false)}
      />
      <ConfirmDialog
        open={confirmDeletePreset !== null}
        title="프리셋을 삭제할까요?"
        message={`"${presets[confirmDeletePreset]?.name}" 프리셋이 삭제됩니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={() => { deletePreset(confirmDeletePreset); setConfirmDeletePreset(null); }}
        onCancel={() => setConfirmDeletePreset(null)}
      />
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 목록']}
        title="메뉴개발노트"
        sub={`전체 ${notes.length}개`}
        actions={
          <div style={{display:'flex',gap:8}}>
            {batchMode ? (
              <>
                <button className="btn" style={{color:'var(--negative)'}}
                  onClick={handleBatchDelete} disabled={selected.size === 0}>
                  선택 삭제 {selected.size > 0 && `(${selected.size})`}
                </button>
                <button className="btn" onClick={() => { setBatchMode(false); setSelected(new Set()); }}>취소</button>
              </>
            ) : (
              <>
                {counts['보고예정'] > 0 && (
                  <button className="btn" onClick={handleBulkCopy}
                    style={{color:'#6B3FCB', borderColor:'#6B3FCB40'}}>
                    <Icon.doc style={{width:13,height:13}}/> 보고예정 일괄복사
                  </button>
                )}
                <button className="btn" onClick={() => setBatchMode(true)} title="다중 선택">선택</button>
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
            <div className="stat-value" style={{color:'#6B3FCB'}}>{counts['보고예정'] || 0}<span className="unit">개</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">출시 전환율</div>
            <div className="stat-value" style={{color:'var(--positive)'}}>{stats.releaseRate}<span className="unit">%</span></div>
          </div>
          {/* 월별 미니 바 차트 */}
          {stats.monthly && (
            <div className="stat-card" style={{flex:'2 1 200px'}}>
              <div className="stat-label" style={{marginBottom:8}}>최근 6개월</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:4,height:36}}>
                {stats.monthly.map(m => {
                  const max = Math.max(...stats.monthly.map(x => x.count), 1);
                  const h = Math.max(4, Math.round(m.count / max * 36));
                  return (
                    <div key={m.label} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2}}>
                      <div style={{
                        width:'100%', height:h, borderRadius:3,
                        background: m.count ? 'var(--accent)' : 'var(--border)',
                        opacity: m.count ? 1 : .4,
                      }}/>
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
        <button className={'chip' + (statusFilter === 'all' ? ' active' : '')} onClick={() => setStatusFilter('all')}>
          전체 <span style={{fontSize:11,opacity:.7}}>{counts.all}</span>
        </button>
        {STATUSES.map(st => (
          <button key={st}
            className={'chip' + (statusFilter === st ? ' active' : '')}
            onClick={() => setStatusFilter(st)}
            style={statusFilter !== st && counts[st] > 0 ? {
              borderColor: STATUS_BORDER[st], color: STATUS_COLORS[st].color,
            } : {}}
          >
            {st} <span style={{fontSize:11,opacity:.7}}>{counts[st]}</span>
          </button>
        ))}
        {/* 정렬 + 뷰 토글 */}
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          {SORT_OPTIONS.map(o => (
            <button key={o.key}
              className={'chip' + (sortBy === o.key ? ' active' : '')}
              onClick={() => changeSort(o.key)}
              style={{fontSize:11}}
            >{o.label}</button>
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
      <div style={{marginTop:10}}>
        <div className="filter-search">
          <Icon.search style={{width:15,height:15,color:'var(--text-3)'}}/>
          <input placeholder="제목, 메뉴명, 테스트 내용, 태그 검색" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* 필터 프리셋 */}
      {(presets.length > 0 || hasActiveFilter) && (
        <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginTop:8}}>
          {presets.map((p, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:0}}>
              <button
                className="chip"
                style={{borderRadius:'12px 0 0 12px', paddingRight:8}}
                onClick={() => applyPreset(p)}
                title={`상태: ${p.status} / 정렬: ${p.sort}`}
              >
                ★ {p.name}
              </button>
              <button
                className="chip"
                style={{borderRadius:'0 12px 12px 0', padding:'4px 8px', borderLeft:'none', color:'var(--text-4)'}}
                onClick={() => setConfirmDeletePreset(i)}
                title="프리셋 삭제"
              >×</button>
            </div>
          ))}
          {hasActiveFilter && (
            savingPreset ? (
              <div style={{display:'flex', gap:4, alignItems:'center'}}>
                <input
                  ref={presetInputRef}
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setSavingPreset(false); }}
                  placeholder="프리셋 이름"
                  autoFocus
                  style={{
                    fontSize:12, padding:'4px 10px', borderRadius:10, border:'1px solid var(--accent)',
                    background:'var(--surface)', color:'var(--text-1)', outline:'none', width:120, fontFamily:'inherit',
                  }}
                />
                <button className="chip active" style={{fontSize:11}} onClick={savePreset}>저장</button>
                <button className="chip" style={{fontSize:11}} onClick={() => setSavingPreset(false)}>취소</button>
              </div>
            ) : (
              <button className="chip" style={{fontSize:11, color:'var(--text-3)'}} onClick={() => setSavingPreset(true)}>
                + 현재 필터 저장
              </button>
            )
          )}
        </div>
      )}

      {/* 스켈레톤 로딩 */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16, marginTop:24 }}>
          {Array.from({ length: 6 }).map((_, i) => <NoteCardSkeleton key={i}/>)}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && notes.length === 0 && (
        <div className="card empty-state" style={{minHeight:200,display:'grid',placeItems:'center',marginTop:16}}>
          <div style={{textAlign:'center',color:'var(--text-3)'}}>
            <div className="empty-float" style={{display:'inline-block',marginBottom:12}}>
              <Icon.note style={{width:40,height:40,opacity:.3}}/>
            </div>
            <div style={{fontWeight:600,marginBottom:4}}>아직 노트가 없어요</div>
            <div style={{fontSize:13}}>메뉴 테스트 결과나 아이디어를 기록해보세요.</div>
            <button className="btn primary" style={{marginTop:16}} onClick={() => router.push('/note/write')}>
              <Icon.plus style={{width:13,height:13}}/> 첫 노트 작성
            </button>
          </div>
        </div>
      )}
      {!loading && notes.length > 0 && filtered.length === 0 && (
        <div className="card empty-state" style={{minHeight:120,display:'grid',placeItems:'center',marginTop:16}}>
          <div style={{textAlign:'center',color:'var(--text-3)'}}>
            <div className="empty-float" style={{display:'inline-block',marginBottom:8,fontSize:28}}>🔍</div>
            <div style={{fontSize:14}}>
              {search ? `"${search}" 검색 결과가 없어요` : '조건에 맞는 노트가 없어요'}
            </div>
          </div>
        </div>
      )}

      {/* 카드 그리드 */}
      {filtered.length > 0 && viewMode === 'card' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16,marginTop:16}}>
          {filtered.map((note, i) => (
            <div key={note.id}
              className={'stagger note-card-wrap' + (deletingIds.has(note.id) ? ' note-card-exit' : '')}
              style={{animationDelay:`${Math.min(i,8)*40}ms`}}>
              {/* hover preview */}
              {note.testContent && note.testContent.length > 80 && (
                <div className="note-hover-preview">{note.testContent}</div>
              )}
              {/* 배치 모드 체크박스 */}
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
                formatDate={formatDate} parseTags={parseTags}
                hlRe={hlRe}
                statusPop={popIds.has(note.id)}
                batchMode={batchMode}
                selected={selected.has(note.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 테이블 뷰 */}
      {filtered.length > 0 && viewMode === 'table' && (
        <div className="card table-card" style={{marginTop:16}}>
          <div style={{overflowX:'auto'}}>
          <table className="data-table">
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
              {filtered.map(note => {
                const sc = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
                const sb = STATUS_BORDER[note.status] || 'var(--border)';
                return (
                  <tr key={note.id} style={{cursor:'pointer'}} onClick={() => setDetailNote(note)}>
                    <td style={{fontWeight:600}}>
                      {note.parentId && <span style={{fontSize:10,color:'var(--text-4)',marginRight:4}}>버전</span>}
                      {note.title}
                    </td>
                    <td style={{color:'var(--text-2)'}}>{note.menuName}</td>
                    <td style={{color:'var(--text-3)',fontSize:12}}>{note.category}</td>
                    <td>
                      <select value={note.status}
                        onChange={e => handleStatusChange(note.id, e.target.value, e)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:12,
                          background:sc.bg, color:sc.color,
                          border:`1px solid ${sc.color}40`, cursor:'pointer', fontFamily:'inherit', outline:'none',
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{fontSize:12,color:'var(--text-3)'}}>{formatDate(note.testDate)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn sm" onClick={() => router.push(`/note/${note.id}`)}>
                          <Icon.edit style={{width:12,height:12}}/>
                        </button>
                        <button className="btn sm" style={{color:'var(--negative)'}}
                          onClick={e => handleDelete(note, e)}>
                          <Icon.trash style={{width:12,height:12}}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {detailNote && (
        <DetailModal note={detailNote} onClose={() => setDetailNote(null)}
          onEdit={() => router.push(`/note/${detailNote.id}`)}
          parseTags={parseTags} formatDate={formatDate}/>
      )}
    </main>
  );
}

function NoteCard({ note, onEdit, onDelete, onCopy, onStatusChange, onNewVersion, onClick, formatDate, parseTags, hlRe, statusPop, batchMode, selected }) {
  const tags = parseTags(note.tags);
  const sc   = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const sb   = STATUS_BORDER[note.status] || 'var(--border)';
  return (
    <div className="card card-lift"
      style={{cursor:'pointer', borderLeft:`4px solid ${sb}`, paddingLeft:20,
        outline: selected ? `2px solid var(--accent)` : 'none', outlineOffset:0,
      }}
      onClick={onClick}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <select value={note.status}
          onChange={e => onStatusChange(e.target.value, e)}
          onClick={e => e.stopPropagation()}
          className={statusPop ? 'status-pop-anim' : ''}
          style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,
            background:sc.bg, color:sc.color,
            border:`1px solid ${sc.color}40`, cursor:'pointer', fontFamily:'inherit', outline:'none'}}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{fontSize:11,color:'var(--text-3)'}}>{note.category} · {note.noteType}</span>
        {note.parentId && <span style={{fontSize:10,color:'var(--text-4)',background:'var(--surface-2)',padding:'1px 6px',borderRadius:8}}>버전</span>}
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-4)'}}>{formatDate(note.testDate)}</span>
      </div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:3,color:'var(--text-1)'}}>{hl(note.title, hlRe)}</div>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>{hl(note.menuName, hlRe)}</div>
      {note.testContent && (
        <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6,marginBottom:10,
          display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {hl(note.testContent, hlRe)}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        {tags.slice(0,3).map(t => (
          <span key={t} style={{fontSize:11,padding:'2px 7px',borderRadius:12,background:'var(--surface-2)',color:'var(--text-3)'}}>#{hl(t, hlRe)}</span>
        ))}
        {!batchMode && (
          <div style={{marginLeft:'auto',display:'flex',gap:5}}>
            <button className="btn sm" onClick={onNewVersion} style={{fontSize:10,padding:'3px 7px',color:'var(--text-3)'}}>+ 버전</button>
            <button className="btn sm" onClick={onCopy} style={{fontSize:10,padding:'3px 7px',color:'var(--text-3)'}}>복사</button>
            <button className="btn sm" onClick={onEdit}><Icon.edit style={{width:12,height:12}}/></button>
            <button className="btn sm" onClick={onDelete} style={{color:'var(--negative)'}}><Icon.trash style={{width:12,height:12}}/></button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailModal({ note, onClose, onEdit, parseTags, formatDate }) {
  const sc   = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const sb   = STATUS_BORDER[note.status] || 'var(--border)';
  const tags = parseTags(note.tags);
  const rows = [
    ['테스트 날짜', note.testDate ? formatDate(note.testDate) : null],
    ['사용 재료',   note.materials],  ['맛 평가',     note.tasteEval],
    ['상무님 평가', note.managerEval], ['원가 검토',   note.costNote],
    ['개선점',      note.improvements],['다음 액션',  note.nextAction],
    ['보고용 요약', note.reportSummary],
  ].filter(([,v]) => v);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'grid',placeItems:'center',animation:'fade 150ms ease'}}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal-anim" style={{width:'min(600px,95vw)',maxHeight:'88vh',overflowY:'auto',padding:'24px 28px',borderLeft:`4px solid ${sb}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:20,background:sc.bg,color:sc.color}}>{note.status}</span>
              <span style={{fontSize:12,color:'var(--text-3)'}}>{note.category} · {note.noteType}</span>
              {note.parentId && <span style={{fontSize:11,color:'var(--text-4)',background:'var(--surface-2)',padding:'2px 8px',borderRadius:8}}>버전 계보</span>}
            </div>
            <div style={{fontWeight:700,fontSize:17,color:'var(--text-1)'}}>{note.title}</div>
            <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>{note.menuName}{note.testDate ? ` · ${formatDate(note.testDate)}` : ''}</div>
          </div>
          <button className="btn" style={{padding:'4px 8px',flexShrink:0}} onClick={onClose}>
            <Icon.close style={{width:16,height:16}}/>
          </button>
        </div>
        {note.testContent && (
          <div style={{background:'var(--surface-2)',borderRadius:10,padding:'12px 14px',fontSize:13,lineHeight:1.7,color:'var(--text-2)',marginBottom:16}}>
            {note.testContent}
          </div>
        )}
        {rows.map(([label,val]) => (
          <div key={label} style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',marginBottom:3}}>{label}</div>
            <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{val}</div>
          </div>
        ))}
        {tags.length > 0 && (
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
            {tags.map(t => <span key={t} style={{fontSize:11,padding:'2px 8px',borderRadius:12,background:'var(--surface-2)',color:'var(--text-3)'}}>#{t}</span>)}
          </div>
        )}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20}}>
          <button className="btn" onClick={onClose}>닫기</button>
          <button className="btn primary" onClick={onEdit}><Icon.edit style={{width:13,height:13}}/> 수정하기</button>
        </div>
      </div>
    </div>
  );
}
