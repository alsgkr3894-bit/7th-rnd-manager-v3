'use client';
import { STATUS_BORDER, STATUS_COLORS } from '@/lib/note/constants';
import { noteDisplayTitle } from '@/lib/note/display';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function DayNoteSection({ notes, canEdit = false, onAdd, onOpen }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          테스트 노트 {notes.length > 0 ? `· ${notes.length}` : ''}
        </span>
        <button className="btn sm ghost xs" onClick={onAdd} disabled={!canEdit}>
          + 추가
        </button>
      </div>
      {notes.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {notes.map((note, i) => (
            <NoteItem
              key={asDisplayText(note.id) || `note-${i}`}
              note={note}
              fallbackIndex={i}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <button
          className="btn sm ghost"
          style={{
            width: '100%',
            textAlign: 'left',
            fontSize: 12,
            color: 'var(--text-4)',
            justifyContent: 'flex-start',
          }}
          onClick={onAdd}
          disabled={!canEdit}
        >
          + 테스트 노트 작성하기
        </button>
      )}
    </div>
  );
}

function NoteItem({ note, onOpen }) {
  const noteId = asDisplayText(note.id);
  const status = asDisplayText(note.status, '아이디어');
  const noteType = asDisplayText(note.noteType);
  const title = noteDisplayTitle(note, '(제목 없음)');
  const testContent = asDisplayText(note.testContent);
  const sc = STATUS_COLORS[status] || STATUS_COLORS['아이디어'];
  const sb = STATUS_BORDER[status] || 'var(--border)';

  return (
    <button
      onClick={() => {
        if (noteId) onOpen(noteId);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        padding: '10px 12px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        font: 'inherit',
        background: 'var(--surface-2)',
        textAlign: 'left',
        width: '100%',
        borderLeft: `3px solid ${sb}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 99,
            background: sc.bg,
            color: sc.color,
            flexShrink: 0,
          }}
        >
          {status}
        </span>
        {noteType && <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{noteType}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35 }}>
        {title}
      </div>
      {testContent && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {testContent}
        </div>
      )}
    </button>
  );
}
