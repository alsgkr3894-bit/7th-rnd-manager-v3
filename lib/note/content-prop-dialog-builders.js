export function buildNoteDialogProps({ canEdit = false, listState, batchActions, itemActions }) {
  const { presets, confirmDeletePreset, setConfirmDeletePreset, deletePreset } = listState;
  const {
    selected,
    confirmBatch,
    setConfirmBatch,
    confirmBatchDelete,
    confirmMerge,
    setConfirmMerge,
    confirmBatchMerge,
    pendingDropMerge,
    setPendingDropMerge,
    confirmDropMerge,
    pendingUnmerge,
    setPendingUnmerge,
    confirmUnmergeGroup,
  } = batchActions;
  const { singleDeleteNote, setSingleDeleteNote, execDelete } = itemActions;

  return {
    confirmBatch,
    confirmMerge,
    dropMergeOpen: Boolean(pendingDropMerge),
    dropMergeTitle: pendingDropMerge?.title || '',
    dropMergeSourceCount: pendingDropMerge?.sourceCount || 0,
    dropMergeMergedCount: pendingDropMerge?.mergedCount || 0,
    unmergeOpen: Boolean(pendingUnmerge),
    unmergeTitle: pendingUnmerge?.title || '',
    unmergeCount: pendingUnmerge?.unmergedCount || 0,
    selectedCount: selected.size,
    onConfirmBatchDelete: () => {
      if (canEdit) confirmBatchDelete();
      else setConfirmBatch(false);
    },
    onCancelBatchDelete: () => setConfirmBatch(false),
    onConfirmBatchMerge: () => {
      if (canEdit) confirmBatchMerge();
      else setConfirmMerge(false);
    },
    onCancelBatchMerge: () => setConfirmMerge(false),
    onConfirmDropMerge: () => {
      if (canEdit) confirmDropMerge();
      else setPendingDropMerge(null);
    },
    onCancelDropMerge: () => setPendingDropMerge(null),
    onConfirmUnmerge: () => {
      if (canEdit) confirmUnmergeGroup();
      else setPendingUnmerge(null);
    },
    onCancelUnmerge: () => setPendingUnmerge(null),
    confirmDeletePreset,
    presetName: presets[confirmDeletePreset]?.name,
    onConfirmPresetDelete: () => {
      deletePreset(confirmDeletePreset);
      setConfirmDeletePreset(null);
    },
    onCancelPresetDelete: () => setConfirmDeletePreset(null),
    singleDeleteOpen: singleDeleteNote !== null,
    onConfirmSingleDelete: () => {
      if (canEdit) execDelete(singleDeleteNote);
      else setSingleDeleteNote(null);
    },
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
