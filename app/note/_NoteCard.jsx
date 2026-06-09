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

const noop = () => {};

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

export function NoteCard({ note = {}, onEdit, onDelete, onCopy, onStatusChange, onNewVersion, onClick, hlRe, statusPop, batchMode, selected, pinned, onPin, onTagClick }) {
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const statusChange = typeof onStatusChange === 'function' ? onStatusChange : noop;
  const newVersion = typeof onNewVersion === 'function' ? onNewVersion : noop;
  const cardClick = typeof onClick === 'function' ? onClick : noop;
  const pin = typeof onPin === 'function' ? onPin : noop;
  const tagClick = typeof onTagClick === 'function' ? onTagClick : noop;
  const status = note.status || '아이디어';
  const category = asText(note.category) || '—';
  const noteType = asText(note.noteType) || '—';
  const testDate = typeof note.testDate === 'string' ? note.testDate : '';
  const title = asText(note.title);
  const menuName = asText(note.menuName);
  const testContent = asText(note.testContent);
  const tags = parseTagList(note.tags);
  const sc   = STATUS_COLORS[status] || STATUS_COLORS['아이디어'];
  const sb   = STATUS_BORDER[status] || 'var(--border)';
  return (
    <div className="card card-lift"
      style={{cursor:'pointer', borderLeft:`4px solid ${sb}`, paddingLeft:20,
        outline: selected ? `2px solid var(--accent)` : 'none', outlineOffset:0,
      }}
      onClick={cardClick}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <select value={status}
          onChange={e => statusChange(e.target.value, e)}
          onClick={e => e.stopPropagation()}
          className={statusPop ? 'status-pop-anim' : ''}
          style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,
            background:sc.bg, color:sc.color,
            border:`1px solid ${sc.color}40`, cursor:'pointer', fontFamily:'inherit', outline:'none'}}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{fontSize:11,color:'var(--text-3)'}}>{category} · {noteType}</span>
        {note.parentId && <span style={{fontSize:10,color:'var(--accent)',marginLeft:4}}>🔗 체인</span>}
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-4)'}}>{formatFullDate(testDate)}</span>
        <button
          className={'pin-btn' + (pinned ? ' pinned' : '')}
          onClick={pin}
          title={pinned ? '핀 해제' : '핀 고정'}
        >{pinned ? '★' : '☆'}</button>
      </div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:3,color:'var(--text-1)'}}>{highlightText(title, hlRe)}</div>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>{highlightText(menuName, hlRe)}</div>
      {testContent && (
        <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6,marginBottom:10,
          display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {highlightText(testContent, hlRe)}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        {tags.slice(0,3).map(t => (
          <span key={t}
            className="tag-chip-clickable"
            style={{fontSize:11,padding:'2px 7px',borderRadius:12,background:'var(--surface-2)',color:'var(--text-3)'}}
            onClick={e => { e.stopPropagation(); tagClick(t); }}
          >#{highlightText(t, hlRe)}</span>
        ))}
        {!batchMode && (
          <div style={{marginLeft:'auto',display:'flex',gap:5}}>
            <button className="btn sm xs" onClick={newVersion} style={{color:'var(--text-3)'}}>+ 버전</button>
            <button className="btn sm xs" onClick={copy} style={{color:'var(--text-3)'}}>복사</button>
            <button className="btn sm" onClick={edit}><Icon.edit style={{width:12,height:12}}/></button>
            <button className="btn sm" onClick={remove} style={{color:'var(--negative)'}}><Icon.trash style={{width:12,height:12}}/></button>
          </div>
        )}
      </div>
    </div>
  );
}
