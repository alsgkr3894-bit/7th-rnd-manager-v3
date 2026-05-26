'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { STATUSES, STATUS_COLORS, STATUS_BORDER, getAllNotes, updateNote } from '@/lib/note';

export default function Page() {
  const router   = useRouter();
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await initDB();
    setNotes(await getAllNotes());
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  async function moveStatus(note, direction) {
    const idx    = STATUSES.indexOf(note.status);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= STATUSES.length) return;
    try {
      await updateNote(note.id, { status: STATUSES[newIdx] });
      showToast(`"${note.title}" → ${STATUSES[newIdx]}`, 'ok');
      await load();
    } catch {
      showToast('상태 변경 실패', 'error');
    }
  }

  const groupedNotes = STATUSES.map(st => ({
    status: st,
    notes: notes.filter(n => n.status === st),
  }));

  const formatDate = d => d ? d.slice(5).replace('-', '.') : '';

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
          return (
            <div key={status} style={{minWidth:180}}>
              {/* 컬럼 헤더 */}
              <div style={{
                display:'flex', alignItems:'center', gap:8, marginBottom:10,
                padding:'8px 12px', borderRadius:10,
                background:sc.bg,
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
                    onEdit={() => router.push(`/note/${note.id}`)}
                    formatDate={formatDate}
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

function KanbanCard({ note, colIdx, maxIdx, onMove, onEdit, formatDate }) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const sb = STATUS_BORDER[note.status] || 'var(--border)';
  return (
    <div style={{
      background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', borderLeft:`3px solid ${sb}`,
      padding:'10px 12px',
    }}>
      <div style={{fontWeight:700, fontSize:13, color:'var(--text-1)', marginBottom:3,
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
      }}>
        {note.title}
      </div>
      <div style={{fontSize:11, color:'var(--text-3)', marginBottom:8}}>
        {note.menuName}
        {note.testDate ? <span> · {formatDate(note.testDate)}</span> : ''}
      </div>
      <div style={{display:'flex', gap:4, alignItems:'center'}}>
        <button
          className="btn sm"
          style={{padding:'2px 6px', fontSize:11, opacity: colIdx === 0 ? .3 : 1}}
          disabled={colIdx === 0}
          onClick={e => { e.stopPropagation(); onMove(-1); }}
          title="이전 상태로"
        >
          ←
        </button>
        <button
          className="btn sm"
          style={{padding:'2px 6px', fontSize:11, opacity: colIdx === maxIdx ? .3 : 1}}
          disabled={colIdx === maxIdx}
          onClick={e => { e.stopPropagation(); onMove(1); }}
          title="다음 상태로"
        >
          →
        </button>
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
