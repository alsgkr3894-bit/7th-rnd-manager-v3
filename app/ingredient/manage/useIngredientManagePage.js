'use client';
import { useCallback } from 'react';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { useIngredientManageData } from './useIngredientManageData';
import { useDiscontinuedRefs } from './useDiscontinuedRefs';
import { useIngredientManageView } from './useIngredientManageView';
import { useIngredientManageActions } from './useIngredientManageActions';
import { useIngredientManagePageState } from './useIngredientManagePageState';
import { useIngredientBatchSelection } from './useIngredientBatchSelection';
import { useIngredientJetteIssueVisibility } from './useIngredientJetteIssueVisibility';
import { productCodeKey } from './ingredientManageUtils';

/**
 * page.jsx가 JSX 조립에만 집중하도록, 데이터 로드·화면 상태·파생 목록·일괄선택·액션·
 * 제때이슈 가시성 훅을 한 곳에 모아 하나의 props 묶음으로 반환한다.
 */
export function useIngredientManagePage() {
  const { isViewer } = useCurrentRole();
  const data = useIngredientManageData();
  const { refs: discontinuedRefs, loading: discontinuedRefsLoading } = useDiscontinuedRefs(
    data.rows,
    data.priceDate
  );
  const pageState = useIngredientManagePageState();
  const view = useIngredientManageView({
    rows: data.rows,
    prevPriceMap: data.prevPriceMap,
    catFilter: pageState.catFilter,
    tagFilter: pageState.tagFilter,
    debouncedSearch: pageState.debouncedSearch,
    loading: data.loading,
    priceDate: data.priceDate,
  });
  const batch = useIngredientBatchSelection({
    rows: data.rows,
    filtered: view.filtered,
    debouncedSearch: pageState.debouncedSearch,
  });
  const actions = useIngredientManageActions({
    rows: data.rows,
    load: data.load,
    setRows: data.setRows,
    formTarget: pageState.formTarget,
    setFormTarget: pageState.setFormTarget,
    resetting: pageState.resetting,
    setResetting: pageState.setResetting,
    setResetConfirm: pageState.setResetConfirm,
    setDeletePending: pageState.setDeletePending,
    dedupeBusy: pageState.dedupeBusy,
    setDedupeBusy: pageState.setDedupeBusy,
    setDedupeConfirm: pageState.setDedupeConfirm,
    selected: batch.selected,
    exitBatch: batch.exitBatch,
    clearSelection: batch.clearSelection,
    setCatFilter: pageState.setCatFilter,
    setTagFilter: pageState.setTagFilter,
    canEdit: !isViewer,
  });
  const jette = useIngredientJetteIssueVisibility({
    newJetteRows: data.newJetteRows,
    jetteRemovedRows: data.jetteRemovedRows,
    onExclude: actions.handleExclude,
  });

  const { setFormTarget, setSubstituteSource } = pageState;
  const onCopy = useCallback(row => setFormTarget({ __copyFrom: row }), [setFormTarget]);
  const onLinkSubstitute = useCallback(
    ref =>
      setSubstituteSource(data.rows.find(r => productCodeKey(r) === productCodeKey(ref)) || ref),
    [data.rows, setSubstituteSource]
  );

  return {
    isViewer,
    data,
    discontinuedRefs,
    discontinuedRefsLoading,
    pageState,
    view,
    batch,
    actions,
    jette,
    onCopy,
    onLinkSubstitute,
  };
}
