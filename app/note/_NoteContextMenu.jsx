'use client';
import { STATUSES } from '@/lib/note';

export function NoteContextMenu({
  ctxMenu,
  pinnedIds,
  onClose,
  onEdit,
  onTogglePin,
  onCopy,
  onStatusChange,
  onDelete,
}) {
  if (!ctxMenu) return null;

  const note = ctxMenu.note;
  const close = typeof onClose === 'function' ? onClose : () => {};

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 299 }}
        onClick={close}
        onContextMenu={e => {
          e.preventDefault();
          close();
        }}
      />
      <div
        className="ctx-menu"
        style={{
          position: 'fixed',
          left: ctxMenu.x,
          top: ctxMenu.y,
          zIndex: 300,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-lg)',
          minWidth: 160,
          overflow: 'hidden',
          animation: 'fade 120ms ease',
        }}
      >
        {[
          { label: '수정', action: () => onEdit(note) },
          {
            label: pinnedIds.has(note.id) ? '핀 해제' : '핀 고정',
            action: () => onTogglePin(note.id),
          },
          {
            label: '복사',
            action: () => onCopy(note),
          },
        ].map(item => (
          <button
            key={item.label}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 14px',
              fontSize: 13,
              color: 'var(--text-1)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseDown={e => {
              e.preventDefault();
              item.action();
              close();
            }}
          >
            {item.label}
          </button>
        ))}
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4, paddingLeft: 4 }}>
            상태 변경
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {STATUSES.map(status => (
              <button
                key={status}
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseDown={e => {
                  e.preventDefault();
                  onStatusChange(note.id, status);
                  close();
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <button
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '9px 14px',
            fontSize: 13,
            color: 'var(--negative)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseDown={e => {
            e.preventDefault();
            onDelete(note);
            close();
          }}
        >
          삭제
        </button>
      </div>
    </>
  );
}
