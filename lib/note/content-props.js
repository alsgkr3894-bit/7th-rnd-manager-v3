import {
  buildNoteBodyProps,
  buildNoteDialogProps,
  buildNoteFilterProps,
  buildNoteHeaderProps,
  buildNotePresetProps,
  buildNoteStatesProps,
  buildNoteStatsProps,
} from '@/lib/note/content-prop-builders';

export function buildNoteContentProps({
  router,
  notesState,
  detailState,
  pins,
  listState,
  handleBulkCopy,
  batchActions,
  itemActions,
}) {
  return {
    dialogsProps: buildNoteDialogProps({ listState, batchActions, itemActions }),
    headerProps: buildNoteHeaderProps({
      router,
      notesState,
      listState,
      handleBulkCopy,
      batchActions,
    }),
    statsProps: buildNoteStatsProps({ notesState, listState }),
    filterProps: buildNoteFilterProps({ listState }),
    presetProps: buildNotePresetProps({ listState }),
    statesProps: buildNoteStatesProps({ router, notesState, listState }),
    bodyProps: buildNoteBodyProps({
      router,
      detailState,
      pins,
      listState,
      batchActions,
      itemActions,
    }),
  };
}
