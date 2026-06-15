export function buildNoteDialogProps({ listState, batchActions, itemActions }) {
  const { presets, confirmDeletePreset, setConfirmDeletePreset, deletePreset } = listState;
  const { selected, confirmBatch, setConfirmBatch, confirmBatchDelete } = batchActions;
  const { singleDeleteNote, setSingleDeleteNote, execDelete } = itemActions;

  return {
    confirmBatch,
    selectedCount: selected.size,
    onConfirmBatchDelete: confirmBatchDelete,
    onCancelBatchDelete: () => setConfirmBatch(false),
    confirmDeletePreset,
    presetName: presets[confirmDeletePreset]?.name,
    onConfirmPresetDelete: () => {
      deletePreset(confirmDeletePreset);
      setConfirmDeletePreset(null);
    },
    onCancelPresetDelete: () => setConfirmDeletePreset(null),
    singleDeleteOpen: singleDeleteNote !== null,
    onConfirmSingleDelete: () => execDelete(singleDeleteNote),
    onCancelSingleDelete: () => setSingleDeleteNote(null),
  };
}

export function buildNotePresetProps({ listState }) {
  const { presets, hasActiveFilter, savePreset, applyPreset, setConfirmDeletePreset } = listState;

  return {
    presets,
    hasActiveFilter,
    onApply: applyPreset,
    onSave: savePreset,
    onDelete: idx => setConfirmDeletePreset(idx),
  };
}
