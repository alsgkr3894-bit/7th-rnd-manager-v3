'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { parseTagList, formatFullDate } from '@/lib/note/utils';

export function NoteDetailModal({ note, onClose, onEdit }) {
  const [closing, setClosing] = useState(false);
  const sc   = STATUS_COLORS[note.status] || STATUS_COLORS['아이디어'];
  const sb   = STATUS_BORDER[note.status] || 'var(--border)';
  const tags = parseTagList(note.tags);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 175);
  }

  const rows = [
    ['테스트 날짜', note.testDate ? formatFullDate(note.testDate) : null],
    ['사용 재료',   note.materials],  ['맛 평가',     note.tasteEval],
    ['상무님 평가', note.managerEval], ['원가 검토',   note.costNote],
    ['개선점',      note.improvements],['다음 액션',  note.nextAction],
    ['보고용 요약', note.reportSummary],
  ].filter(([,v]) => v);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'grid',placeItems:'center',animation:'fade 150ms ease'}}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={'card ' + (closing ? 'modal-exit' : 'modal-anim')} style={{width:'min(600px,95vw)',maxHeight:'88vh',overflowY:'auto',padding:'24px 28px',borderLeft:`4px solid ${sb}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:20,background:sc.bg,color:sc.color}}>{note.status}</span>
              <span style={{fontSize:12,color:'var(--text-3)'}}>{note.category} · {note.noteType}</span>
              {note.parentId && <span style={{fontSize:11,color:'var(--text-4)',background:'var(--surface-2)',padding:'2px 8px',borderRadius:8}}>버전 계보</span>}
            </div>
            <div style={{fontWeight:700,fontSize:17,color:'var(--text-1)'}}>{note.title}</div>
            <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>
              {note.menuName}{note.testDate ? ` · ${formatFullDate(note.testDate)}` : ''}
            </div>
          </div>
          <button className="btn xs" style={{flexShrink:0}} onClick={handleClose}>
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
          <button className="btn" onClick={handleClose}>닫기</button>
          <button className="btn primary" onClick={onEdit}><Icon.edit style={{width:13,height:13}}/> 수정하기</button>
        </div>
      </div>
    </div>
  );
}
