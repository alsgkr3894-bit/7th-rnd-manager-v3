'use client';
import { useEffect, useState, useCallback } from 'react';
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
  const [bouncingIds,     setBouncingIds]     = useState(new Set());

  const load = useCallback(async () => {
    await initDB();
    setNotes(await getAllNotes());
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);

  async function applyStatusChange(note, newStatus, { bounce = true } = {}) {
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
    }
  }

  function moveStatus(note, direction) {
    const newIdx = STATUSES.indexOf(note.status) + direction;
    if (newIdx < 0 || newIdx >= STATUSES.length) return;
    return applyStatusChange(note, STATUSES[newIdx]);
  }

  function changeStatus(note, newStatus) {
    if (note.status === newStatus) return;
    return applyStatusChange(note, newStatus);
  }

  async function handleDrop(e, status) {
    e.preventDefault();
    setDragOverStatus(null);
    const noteId = e.dataTransfer.getData('noteId');
    if (!noteId) return;
    const note = notes.find(n => String(n.id) === String(noteId));
    if (!note || note.status === status) return;
    await applyStatusChange({ id: Number(noteId), status: note.status }, status, { bounce: false });
    setDragId(null);
  }

  const groupedNotes = STATUSES.map(st => ({
    status: st,
    notes: notes.filter(n => n.status === st),
  }));


  return (
    <main className="main">
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
              onDragLeave={() => setDragOverStatus(null)}
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
                {colNotes.map(note => (
                  <KanbanCard
                    key={note.id}
                    note={note}
                    colIdx={colIdx}
                    maxIdx={STATUSES.length - 1}
                    onMove={dir => moveStatus(note, dir)}
                    onStatusChange={s => changeStatus(note, s)}
                    onEdit={() => router.push(`/note/${note.id}`)}

                    isDragging={dragId === note.id}
                    bouncing={bouncingIds.has(note.id)}
                    onDragStart={e => {
                      e.dataTransfer.setData('noteId', note.id);
                      setDragId(note.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverStatus(null);
                    }}
                  />
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

function KanbanCard({ note, colIdx, maxIdx, onMove, onStatusChange, onEdit, isDragging, bouncing, onDragStart, onDragEnd }) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const sb = STATUS_BORDER[note.status] || 'var(--border)';
  return (
    <div
      className={`kanban-card${isDragging ? ' kanban-card-dragging' : ''}${bouncing ? ' kanban-card-bounce' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background:'var(--surface)', borderRadius:10,
        border:'1px solid var(--border)', borderLeft:`3px solid ${sb}`,
        padding:'10px 12px',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        transition: 'opacity 0.15s',
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
          onClick={e => { e.stopPropagation(); onMove(-1); }}
          title="이전 상태로"
        >←</button>
        <button
          className="btn sm kanban-arrow-btn"
          style={{padding:'2px 6px', fontSize:11, opacity: colIdx === maxIdx ? .3 : 1}}
          disabled={colIdx === maxIdx}
          onClick={e => { e.stopPropagation(); onMove(1); }}
          title="다음 상태로"
        >→</button>

        {/* 모바일: 상태 직접 선택 */}
        <select
          className="kanban-status-select"
          value={note.status}
          onChange={e => { e.stopPropagation(); onStatusChange(e.target.value); }}
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
          onClick={e => { e.stopPropagation(); onEdit(); }}
          title="수정"
        >
          <Icon.edit style={{width:11,height:11}}/>
        </button>
      </div>
    </div>
  );
}
