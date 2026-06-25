export function buildSampleCompareBarProps({ compare }) {
  return {
    compareMode: compare.compareMode,
    compareCount: compare.compareSet.size,
    onOpenCompare: () => compare.setShowCompare(true),
  };
}

export function buildSampleDialogsProps({
  pageState,
  batch,
  compare,
  recordActions,
  confirmElement,
  navigation,
  canEdit = false,
}) {
  const { detailRec, setDetailRec } = pageState;
  const { editDetail, openSampleNextRound } = navigation;

  return {
    detailRec,
    showCompare: compare.showCompare,
    compareItems: compare.compareItems,
    confirmOpen: batch.confirmOpen,
    selectedCount: batch.selected.size,
    confirmElement,
    canEdit,
    onCloseDetail: () => setDetailRec(null),
    onEditDetail: () => {
      if (canEdit) editDetail();
    },
    onNextRoundDetail: () => canEdit && detailRec && openSampleNextRound(detailRec),
    onDeleteDetail: () => canEdit && detailRec && recordActions.handleDelete(detailRec),
    onCloseCompare: () => compare.setShowCompare(false),
    onConfirmBatchDelete: batch.confirmBatchDelete,
    onCancelBatchDelete: () => batch.setConfirmOpen(false),
  };
}
