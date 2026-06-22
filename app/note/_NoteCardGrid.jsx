'use client';
import { NoteCard } from './_NoteCard';

export function NoteCardGrid({
  visible,
  filteredCount,
  canEdit = false,
  batchMode,
  selected,
  pinnedIds,
  popIds,
  hlRe,
  onContextMenu,
  onToggleSelect,
  onOpen,
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
  onNewVersion,
  onPin,
  onTagClick,
  onLoadMore,
}) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        {visible.map((note, i) => (
          <div
            key={note.id}
            className="stagger note-card-wrap"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            onContextMenu={e => onContextMenu(note, e)}
          >
            {note.testContent && note.testContent.length > 80 && (
              <div className="note-hover-preview">{note.testContent}</div>
            )}
            {canEdit && batchMode && (
              <div
                className={'batch-checkbox-wrap' + (selected.has(note.id) ? ' checked' : '')}
                onClick={e => {
                  e.stopPropagation();
                  onToggleSelect(note.id);
                }}
              >
                {selected.has(note.id) && <span style={{ fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
            )}
            <NoteCard
              note={note}
              onEdit={e => onEdit(note, e)}
              onDelete={e => onDelete(note, e)}
              onCopy={e => onCopy(note, e)}
              onStatusChange={(status, e) => onStatusChange(note.id, status, e)}
              onNewVersion={e => onNewVersion(note, e)}
              onClick={() => (canEdit && batchMode ? onToggleSelect(note.id) : onOpen(note))}
              hlRe={hlRe}
              statusPop={popIds.has(note.id)}
              batchMode={batchMode}
              selected={selected.has(note.id)}
              pinned={pinnedIds.has(note.id)}
              onPin={e => onPin(note.id, e)}
              onTagClick={onTagClick}
              canEdit={canEdit}
            />
          </div>
        ))}
      </div>
      {visible.length < filteredCount && (
        <button className="load-more-btn" onClick={onLoadMore}>
          더 보기 ({filteredCount - visible.length}개 남음)
        </button>
      )}
    </>
  );
}
