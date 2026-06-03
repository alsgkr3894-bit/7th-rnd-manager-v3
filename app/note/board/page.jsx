'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { STATUSES, STATUS_COLORS, STATUS_BORDER, getAllNotes, updateNote } from '@/lib/note';
import { formatShortDate } from '@/lib/note/utils';

export default function Page() {
  const router   = useRouter();
  const [notes,           setNotes]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [dragId,          setDragId]          = useState(null);
  const [dragOverStatus,  setDragOverStatus]  = useState(null);
  const [dropTarget,      setDropTarget]      = useState(null); // { status, beforeIdx }
  const [bouncingIds,     setBouncingIds]     = useState(new Set());

  const load = useCallback(async () => {
    await initDB();
    setNotes(await getAllNotes());
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);

  const applyStatusChange = useCallback(async (note, newStatus, { bounce = true } = {}) => {
    // Optimistic update — instant visual feedback
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, status: newStatus } : n));
    try {
      await updateNote(note.id, { status: newStatus });
      showToast(`→ ${newStatus}`, 'ok');
      await load();
      if (bounce) {
        setBouncingIds(s => new Set([...s, note.id]));
        setTimeout(() => setBouncingIds(s => { const n = new Set(s); n.delete(note.id); return n; }), 400);
      }
    } catch {
      showToast('상태 변경 실패', 'err');
      await load(); // 낙관적 업데이트 실패 시 롤백
    }
  }, [load]);

  const moveStatus = useCallback((note, direction) => {
    const newIdx = STATUSES.indexOf(note.status) + direction;
    if (newIdx < 0 || newIdx >= STATUSES.length) return;
    return applyStatusChange(note, STATUSES[newIdx]);
  }, [applyStatusChange]);

  const changeStatus = useCallback((note, newStatus) => {
    if (note.status === newStatus) return;
    return applyStatusChange(note, newStatus);
  }, [applyStatusChange]);

  async function handleDrop(e, status) {
    e.preventDefault();
    setDragOverStatus(null);
    const noteId = e.dataTransfer.getData('noteId');
    if (!noteId) { setDropTarget(null); return; }
    const note = notes.find(n => String(n.id) === String(noteId));
    if (!note) { setDropTarget(null); return; }

    const colNotes = groupedNotes.find(g => g.status === status)?.notes ?? [];
    const beforeIdx = dropTarget?.status === status
      ? (dropTarget.beforeIdx ?? colNotes.length)
      : colNotes.length;
    setDropTarget(null);

    if (note.status === status) {
      // 같은 컬럼 내 순서 변경 — boardOrder를 DB에 저장
      const without = colNotes.filter(n => n.id !== note.id);
      const origIdx = colNotes.findIndex(n => n.id === note.id);
      const insertAt = origIdx < beforeIdx ? beforeIdx - 1 : beforeIdx;
      without.splice(Math.max(0, Math.min(insertAt, without.length)), 0, note);
      await Promise.all(without.map((n, i) => updateNote(n.id, { boardOrder: i * 10 })));
      await load();
    } else {
      // 다른 컬럼으로 이동 — 상태 변경 + 새 위치에 삽입
      const newCol = [...colNotes];
      newCol.splice(Math.min(beforeIdx, newCol.length), 0, note);
      await Promise.all([
        updateNote(note.id, { status, boardOrder: Math.min(beforeIdx, newCol.length - 1) * 10 }),
        ...newCol.filter(n => n.id !== note.id).map((n, i) => {
          const order = (i >= Math.min(beforeIdx, newCol.length - 1) ? i + 1 : i) * 10;
          return updateNote(n.id, { boardOrder: order });
        }),
      ]);
      showToast(`→ ${status}`, 'ok');
      await load();
      setBouncingIds(s => new Set([...s, note.id]));
      setTimeout(() => setBouncingIds(s => { const n = new Set(s); n.delete(note.id); return n; }), 400);
    }
    setDragId(null);
  }

  // boardOrder 오름차순 정렬 — 없으면(구 데이터) createdAt 역순 유지
  const groupedNotes = useMemo(
    () => STATUSES.map(st => ({
      status: st,
      notes: notes
        .filter(n => n.status === st)
        .sort((a, b) =>
          a.boardOrder != null && b.boardOrder != null
            ? a.boardOrder - b.boardOrder
            : (a.boardOrder != null ? -1 : b.boardOrder != null ? 1 : 0)
        ),
    })),
    [notes]
  );


  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['메뉴개발노트', '칸반 보드']}
        title="칸반 보드"
        sub={`전체 ${notes.length}개`}
        actions={
          <div style={{display:'flex',gap:8}}>
            <button className="btn" onClick={() => router.push('/note')}>목록 뷰</button>
            <button className="btn primary" onClick={() => router.push('/note/write')}>
              <Icon.plus style={{width:14,height:14}}/> 노트 작성
            </button>
          </div>
        }
      />

      {/* 칸반 컬럼 컨테이너 */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(${STATUSES.length}, minmax(200px, 1fr))`,
        gap:12,
        marginTop:20,
        overflowX:'auto',
        paddingBottom:16,
      }}>
        {groupedNotes.map(({ status, notes: colNotes }, colIdx) => {
          const sc = STATUS_COLORS[status] || STATUS_COLORS['아이디어'];
          const sb = STATUS_BORDER[status]  || 'var(--border)';
          const isOver = dragOverStatus === status;
          return (
            <div
              key={status}
              style={{minWidth:180}}
              className={isOver ? 'kanban-col-over' : undefined}
              onDragOver={e => { e.preventDefault(); setDragOverStatus(status); }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setDragOverStatus(null);
                  setDropTarget(null);
                }
              }}
              onDrop={e => handleDrop(e, status)}
            >
              {/* 컬럼 헤더 */}
              <div style={{
                display:'flex', alignItems:'center', gap:8, marginBottom:10,
                padding:'8px 12px', borderRadius:10,
                background: isOver ? (sc.bg + 'cc') : sc.bg,
                transition: 'background 0.15s',
              }}>
                <div style={{
                  width:8, height:8, borderRadius:'50%', background:sb, flexShrink:0,
                }}/>
                <span style={{fontSize:13, fontWeight:700, color:sc.color}}>{status}</span>
                <span style={{
                  marginLeft:'auto', fontSize:11, fontWeight:700,
                  background:sb+'22', color:sc.color,
                  padding:'1px 7px', borderRadius:10,
                }}>{colNotes.length}</span>
              </div>

              {/* 노트 카드들 */}
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {colNotes.length === 0 && (
                  <div style={{
                    borderRadius:10, border:'2px dashed var(--border)',
                    padding:'16px 12px', textAlign:'center',
                    color:'var(--text-4)', fontSize:12,
                  }}>
                    없음
                  </div>
                )}
                {colNotes.map((note, cardIdx) => (
                  <div
                    key={note.id}
                    onDragOver={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const midY = rect.top + rect.height / 2;
                      const beforeIdx = e.clientY < midY ? cardIdx : cardIdx + 1;
                      setDropTarget({ status, beforeIdx });
                    }}
                  >
                    {dropTarget?.status === status && dropTarget?.beforeIdx === cardIdx && (
                      <div className="kanban-drop-indicator" />
                    )}
                    <KanbanCard
                      note={note}
                      colIdx={colIdx}
                      maxIdx={STATUSES.length - 1}
                      onMove={moveStatus}
                      onStatusChange={changeStatus}
                      onEdit={router.push}
                      isDragging={dragId === note.id}
                      bouncing={bouncingIds.has(note.id)}
                      onDragStart={e => {
                        e.dataTransfer.setData('noteId', note.id);
                        setDragId(note.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverStatus(null);
                        setDropTarget(null);
                      }}
                    />
                    {dropTarget?.status === status && dropTarget?.beforeIdx === cardIdx + 1 && cardIdx === colNotes.length - 1 && (
                      <div className="kanban-drop-indicator" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && notes.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:'40px 24px',color:'var(--text-3)',marginTop:8}}>
          <Icon.note style={{width:32,height:32,marginBottom:12,opacity:.35}}/>
          <div style={{fontWeight:600,marginBottom:4}}>아직 노트가 없어요</div>
          <button className="btn primary" style={{marginTop:12}} onClick={() => router.push('/note/write')}>
            <Icon.plus style={{width:13,height:13}}/> 노트 작성
          </button>
        </div>
      )}
    </main>
  );
}

const KanbanCard = React.memo(function KanbanCard({ note, colIdx, maxIdx, onMove, onStatusChange, onEdit, isDragging, bouncing, onDragStart, onDragEnd }) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const sb = STATUS_BORDER[note.status] || 'var(--border)';

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onMove(note, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onMove(note, 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit(`/note/${note.id}`);
    }
  }

  return (
    <div
      className={`kanban-card${isDragging ? ' kanban-card-dragging' : ''}${bouncing ? ' kanban-card-bounce' : ''}`}
      draggable
      tabIndex={0}
      role="article"
      aria-label={note.title}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={handleKeyDown}
      style={{
        background:'var(--surface)', borderRadius:10,
        border:'1px solid var(--border)', borderLeft:`3px solid ${sb}`,
        padding:'10px 12px',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        transition: 'opacity 0.15s',
        outline: 'none',
      }}
    >
      <div style={{fontWeight:700, fontSize:13, color:'var(--text-1)', marginBottom:3,
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
      }}>
        {note.title}
      </div>
      <div style={{fontSize:11, color:'var(--text-3)', marginBottom:8}}>
        {note.menuName}
        {note.testDate ? <span> · {formatShortDate(note.testDate)}</span> : ''}
      </div>
      <div style={{display:'flex', gap:4, alignItems:'center'}}>
        {/* 데스크탑: ← → 버튼 */}
        <button
          className="btn sm kanban-arrow-btn"
          style={{padding:'2px 6px', fontSize:11, opacity: colIdx === 0 ? .3 : 1}}
          disabled={colIdx === 0}
          onClick={e => { e.stopPropagation(); onMove(note, -1); }}
          title="이전 상태로"
        >←</button>
        <button
          className="btn sm kanban-arrow-btn"
          style={{padding:'2px 6px', fontSize:11, opacity: colIdx === maxIdx ? .3 : 1}}
          disabled={colIdx === maxIdx}
          onClick={e => { e.stopPropagation(); onMove(note, 1); }}
          title="다음 상태로"
        >→</button>

        {/* 모바일: 상태 직접 선택 */}
        <select
          className="kanban-status-select"
          value={note.status}
          onChange={e => { e.stopPropagation(); onStatusChange(note, e.target.value); }}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:10,
            background:sc.bg, color:sc.color,
            border:`1px solid ${sc.color}40`, cursor:'pointer',
            fontFamily:'inherit', outline:'none', maxWidth:90,
          }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          className="btn sm"
          style={{marginLeft:'auto', padding:'2px 6px'}}
          onClick={e => { e.stopPropagation(); onEdit(`/note/${note.id}`); }}
          title="수정"
        >
          <Icon.edit style={{width:11,height:11}}/>
        </button>
      </div>
    </div>
  );
});
