'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNotePins } from '@/hooks/useNotePins';
import { useNoteBatchActions } from '@/hooks/useNoteBatchActions';
import { useNoteItemActions } from '@/hooks/useNoteItemActions';
import { useNoteListData } from '@/hooks/useNoteListData';
import { useNoteListState } from '@/hooks/useNoteListState';
import { useNoteReportingCopy } from '@/hooks/useNoteReportingCopy';
import { buildNoteContentProps } from '@/lib/note/content-props';
import { useCurrentRole } from '@/hooks/useCurrentRole';

export function useNoteContentController() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;

  const notesState = useNoteListData();
  const { notes, setNotes, load } = notesState;
  const [detailNote, setDetailNote] = useState(null);
  const pins = useNotePins();
  const { pinnedIds } = pins;
  const listState = useNoteListState({ notes, pinnedIds, pathname });

  const handleBulkCopy = useNoteReportingCopy(notes);

  const batchActions = useNoteBatchActions({ setNotes, load, canEdit });

  const itemActions = useNoteItemActions({
    router,
    setNotes,
    load,
    detailNote,
    setDetailNote,
    canEdit,
  });

  return buildNoteContentProps({
    canEdit,
    router,
    notesState,
    detailState: { detailNote, setDetailNote },
    pins,
    listState,
    handleBulkCopy,
    batchActions,
    itemActions,
  });
}
