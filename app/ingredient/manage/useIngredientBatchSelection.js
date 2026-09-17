'use client';
import { useCallback, useEffect, useMemo } from 'react';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { isDeletableIngredientRow } from '@/components/ingredient/manage-row/manageRowUtils';

/**
 * 일괄 선택 모드 상태와, 필터가 적용된 목록 기준 전체선택/삭제가능 건수 파생값을 관리한다.
 * 전체 선택은 현재 탭·분류·태그·검색이 적용된 filtered 전체를 대상으로 한다(IssuesView의 전체 선택과 같은 범위).
 */
export function useIngredientBatchSelection({ rows, filtered, debouncedSearch }) {
  const { batchMode, selected, setSelected, clearSelection, startBatch, exitBatch, toggleSelect } =
    useBatchSelection();

  useEffect(() => {
    clearSelection();
  }, [debouncedSearch, clearSelection]);

  // 선택(selected)은 단종/분류 변경까지 포함하는 넓은 범위라, 일괄 삭제 확인 문구/버튼은
  // 실제로 삭제될 개수(수동+제품코드 없는 행)를 따로 계산해 보여준다 — 안 그러면
  // "5개를 삭제할까요?"라고 물어놓고 실제론 일부만(제때 연동 행은 제외) 지워진다.
  const deletableSelectedCount = useMemo(
    () => rows.filter(r => selected.has(r.id) && isDeletableIngredientRow(r)).length,
    [rows, selected]
  );

  const selectableIds = useMemo(
    () => filtered.filter(r => r.id != null).map(r => r.id),
    [filtered]
  );
  const allFilteredSelected =
    selectableIds.length > 0 && selectableIds.every(id => selected.has(id));
  const toggleSelectAll = useCallback(() => {
    setSelected(allFilteredSelected ? new Set() : new Set(selectableIds));
  }, [allFilteredSelected, selectableIds, setSelected]);

  return {
    batchMode,
    selected,
    setSelected,
    clearSelection,
    startBatch,
    exitBatch,
    toggleSelect,
    deletableSelectedCount,
    selectableIds,
    allFilteredSelected,
    toggleSelectAll,
  };
}
