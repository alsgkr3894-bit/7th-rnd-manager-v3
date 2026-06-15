'use client';
import { useEffect, useState } from 'react';
import { NoteCardGrid } from './_NoteCardGrid';
import { NoteContextMenu } from './_NoteContextMenu';
import { NoteDetailModal } from './_NoteDetailModal';
import { NoteTableView } from './_NoteTableView';

export function NoteListBody({
  filtered,
  visible,
  viewMode,
  batchMode,
  selected,
  pinnedIds,
  popIds,
  hlRe,
  detailNote,
  onOpenDetail,
  onCloseDetail,
  onEditNote,
  onToggleSelect,
  onTogglePin,
  onCopy,
  onDelete,
  onStatusChange,
  onNewVersion,
  onTagClick,
  onLoadMore,
}) {
  const [ctxMenu, setCtxMenu] = useState(null);
  const [focusedRow, setFocusedRow] = useState(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = e => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctxMenu]);

  const openContextMenu = (note, e) => {
    e.preventDefault();
    const x = Math.min(e.clientX || 0, window.innerWidth - 180);
    const y = Math.min(e.clientY || 0, window.innerHeight - 220);
    setCtxMenu({ x, y, note });
  };

  return (
    <>
      <NoteContextMenu
        ctxMenu={ctxMenu}
        pinnedIds={pinnedIds}
        onClose={() => setCtxMenu(null)}
        onEdit={onEditNote}
        onTogglePin={onTogglePin}
        onCopy={note => onCopy(note, { stopPropagation: () => {} })}
        onStatusChange={(noteId, status) =>
          onStatusChange(noteId, status, { stopPropagation: () => {} })
        }
        onDelete={onDelete}
      />

      {filtered.length > 0 && viewMode === 'card' && (
        <NoteCardGrid
          visible={visible}
          filteredCount={filtered.length}
          batchMode={batchMode}
          selected={selected}
          pinnedIds={pinnedIds}
          popIds={popIds}
          hlRe={hlRe}
          onContextMenu={openContextMenu}
          onToggleSelect={onToggleSelect}
          onOpen={onOpenDetail}
          onEdit={(note, e) => {
            e?.stopPropagation();
            onEditNote(note);
          }}
          onDelete={onDelete}
          onCopy={onCopy}
          onStatusChange={onStatusChange}
          onNewVersion={onNewVersion}
          onPin={onTogglePin}
          onTagClick={onTagClick}
          onLoadMore={onLoadMore}
        />
      )}

      {filtered.length > 0 && viewMode === 'table' && (
        <NoteTableView
          visible={visible}
          filtered={filtered}
          focusedRow={focusedRow}
          onFocusRow={setFocusedRow}
          onOpen={onOpenDetail}
          onEdit={onEditNote}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onLoadMore={onLoadMore}
        />
      )}

      {detailNote && (
        <NoteDetailModal
          note={detailNote}
          onClose={onCloseDetail}
          onEdit={() => onEditNote(detailNote)}
        />
      )}
    </>
  );
}
