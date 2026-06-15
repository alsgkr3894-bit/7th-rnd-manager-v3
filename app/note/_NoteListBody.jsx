'use client';
import { useState } from 'react';
import { useNoteContextMenuState } from './useNoteContextMenuState';
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
  const [focusedRow, setFocusedRow] = useState(null);
  const { ctxMenu, openContextMenu, closeContextMenu } = useNoteContextMenuState();

  return (
    <>
      <NoteContextMenu
        ctxMenu={ctxMenu}
        pinnedIds={pinnedIds}
        onClose={closeContextMenu}
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
