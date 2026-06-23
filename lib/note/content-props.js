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
  canEdit = false,
  router,
  notesState,
  detailState,
  pins,
  listState,
  handleBulkCopy,
  handleReportPdf,
  batchActions,
  itemActions,
}) {
  return {
    dialogsProps: buildNoteDialogProps({ canEdit, listState, batchActions, itemActions }),
    headerProps: buildNoteHeaderProps({
      canEdit,
      router,
      notesState,
      listState,
      handleBulkCopy,
      handleReportPdf,
      batchActions,
    }),
    statsProps: buildNoteStatsProps({ notesState, listState }),
    filterProps: buildNoteFilterProps({ listState }),
    presetProps: buildNotePresetProps({ listState }),
    statesProps: buildNoteStatesProps({ canEdit, router, notesState, listState }),
    bodyProps: buildNoteBodyProps({
      canEdit,
      router,
      detailState,
      pins,
      listState,
      batchActions,
      itemActions,
    }),
  };
}
