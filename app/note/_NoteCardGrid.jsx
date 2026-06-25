'use client';
import { NoteIdeaGroupCard } from './_NoteIdeaGroupCard';
import { buildNoteIdeaGroups } from './noteIdeaGroups';

export function NoteCardGrid({
  visible,
  filtered,
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
  const groups = buildNoteIdeaGroups(filtered, visible);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        {groups.map((group, i) => (
          <div
            key={group.key}
            className="stagger note-card-wrap"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <NoteIdeaGroupCard
              group={group}
              canEdit={canEdit}
              batchMode={batchMode}
              selected={selected}
              pinnedIds={pinnedIds}
              popIds={popIds}
              hlRe={hlRe}
              onContextMenu={onContextMenu}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
              onCopy={onCopy}
              onStatusChange={onStatusChange}
              onNewVersion={onNewVersion}
              onPin={onPin}
              onTagClick={onTagClick}
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
