export function buildSampleLoadErrorProps({ pageState }) {
  const { loadError, reload } = pageState;

  return {
    loadError,
    onRetry: reload,
  };
}

export function buildSampleHeaderProps({ pageState }) {
  const { samples } = pageState;

  return {
    breadcrumb: ['샘플기록'],
    title: '샘플기록',
    sub: `총 ${samples.length}개 샘플`,
  };
}

export function buildSampleActionsProps({ pageState, batch, compare, navigation }) {
  const { filtered } = pageState;
  const { openWrite } = navigation;

  return {
    filtered,
    batchMode: batch.batchMode,
    compareMode: compare.compareMode,
    selected: batch.selected,
    onBatchDelete: batch.handleBatchDelete,
    onExitBatchMode: batch.exitBatchMode,
    onExitCompareMode: compare.exitCompareMode,
    onStartBatchMode: () => batch.setBatchMode(true),
    onStartCompareMode: () => compare.setCompareMode(true),
    onCreateSample: openWrite,
  };
}
