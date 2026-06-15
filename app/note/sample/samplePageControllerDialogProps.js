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
}) {
  const { detailRec, setDetailRec } = pageState;
  const { editDetail } = navigation;

  return {
    detailRec,
    showCompare: compare.showCompare,
    compareItems: compare.compareItems,
    confirmOpen: batch.confirmOpen,
    selectedCount: batch.selected.size,
    confirmElement,
    onCloseDetail: () => setDetailRec(null),
    onEditDetail: editDetail,
    onDeleteDetail: () => detailRec && recordActions.handleDelete(detailRec),
    onCloseCompare: () => compare.setShowCompare(false),
    onConfirmBatchDelete: batch.confirmBatchDelete,
    onCancelBatchDelete: () => batch.setConfirmOpen(false),
  };
}
