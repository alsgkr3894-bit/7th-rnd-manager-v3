'use client';
import { useState } from 'react';
import { useNoteContextMenuState } from './useNoteContextMenuState';
import { NoteCardGrid } from './_NoteCardGrid';
import { NoteContextMenu } from './_NoteContextMenu';
import { NoteDetailModal } from './_NoteDetailModal';
import { NoteTableView } from './_NoteTableView';
import {
  buildNoteCardGridProps,
  buildNoteContextMenuProps,
  buildNoteDetailModalProps,
  buildNoteTableViewProps,
} from './noteListBodyProps';

export function NoteListBody(props) {
  const { filtered, viewMode, detailNote } = props;
  const [focusedRow, setFocusedRow] = useState(null);
  const { ctxMenu, openContextMenu, closeContextMenu } = useNoteContextMenuState();
  const hasRows = filtered.length > 0;
  const bodyProps = {
    ...props,
    focusedRow,
    setFocusedRow,
    ctxMenu,
    openContextMenu,
    closeContextMenu,
  };

  return (
    <>
      <NoteContextMenu {...buildNoteContextMenuProps(bodyProps)} />

      {hasRows && viewMode === 'card' && <NoteCardGrid {...buildNoteCardGridProps(bodyProps)} />}

      {hasRows && viewMode === 'table' && <NoteTableView {...buildNoteTableViewProps(bodyProps)} />}

      {detailNote && <NoteDetailModal {...buildNoteDetailModalProps(bodyProps)} />}
    </>
  );
}
