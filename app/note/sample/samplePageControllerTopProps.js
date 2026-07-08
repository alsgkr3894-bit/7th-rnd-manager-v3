import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';

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
    breadcrumb: [SAMPLE_RECORD_LABEL],
    title: SAMPLE_RECORD_LABEL,
    sub: `총 ${samples.length}개 샘플`,
  };
}

export function buildSampleActionsProps({
  pageState,
  batch,
  compare,
  navigation,
  canEdit = false,
}) {
  const { filtered } = pageState;
  const { openWrite } = navigation;

  return {
    filtered,
    batchMode: batch.batchMode,
    compareMode: compare.compareMode,
    selected: batch.selected,
    canEdit,
    onBatchDelete: batch.handleBatchDelete,
    onExitBatchMode: batch.exitBatchMode,
    onExitCompareMode: compare.exitCompareMode,
    onStartBatchMode: () => {
      if (canEdit) batch.setBatchMode(true);
    },
    onStartCompareMode: () => compare.setCompareMode(true),
    onCreateSample: () => {
      if (canEdit) openWrite();
    },
  };
}
