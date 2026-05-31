'use client';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { parseTagList, formatFullDate } from '@/lib/note/utils';

/** 검색어 하이라이트 적용 (React 요소 배열 반환) */
export function highlightText(text, regex) {
  if (!regex || !text) return text;
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="search-hl">{part}</mark>
      : part
  );
}

export function NoteCard({ note, onEdit, onDelete, onCopy, onStatusChange, onNewVersion, onClick, hlRe, statusPop, batchMode, selected, pinned, onPin, onTagClick }) {
  const tags = parseTagList(note.tags);
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
        {note.parentId && <span style={{fontSize:10,color:'var(--accent)',marginLeft:4}}>🔗 체인</span>}
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-4)'}}>{formatFullDate(note.testDate)}</span>
        <button
          className={'pin-btn' + (pinned ? ' pinned' : '')}
          onClick={onPin}
          title={pinned ? '핀 해제' : '핀 고정'}
        >{pinned ? '★' : '☆'}</button>
      </div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:3,color:'var(--text-1)'}}>{highlightText(note.title, hlRe)}</div>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>{highlightText(note.menuName, hlRe)}</div>
      {note.testContent && (
        <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6,marginBottom:10,
          display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {highlightText(note.testContent, hlRe)}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        {tags.slice(0,3).map(t => (
          <span key={t}
            className="tag-chip-clickable"
            style={{fontSize:11,padding:'2px 7px',borderRadius:12,background:'var(--surface-2)',color:'var(--text-3)'}}
            onClick={e => { e.stopPropagation(); onTagClick?.(t); }}
          >#{highlightText(t, hlRe)}</span>
        ))}
        {!batchMode && (
          <div style={{marginLeft:'auto',display:'flex',gap:5}}>
            <button className="btn sm xs" onClick={onNewVersion} style={{color:'var(--text-3)'}}>+ 버전</button>
            <button className="btn sm xs" onClick={onCopy} style={{color:'var(--text-3)'}}>복사</button>
            <button className="btn sm" onClick={onEdit}><Icon.edit style={{width:12,height:12}}/></button>
            <button className="btn sm" onClick={onDelete} style={{color:'var(--negative)'}}><Icon.trash style={{width:12,height:12}}/></button>
          </div>
        )}
      </div>
    </div>
  );
}
