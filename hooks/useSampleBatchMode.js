'use client';
import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteSample } from '@/lib/sample';
import { toSampleSelectionIds, toggleSampleSelection } from '@/lib/sample/selection';

/**
 * 샘플 배치 삭제 모드의 선택 상태와 액션을 관리한다.
 *
 * @param {Function} onDeletedOptimistic - 낙관적 업데이트용 콜백 (ids => void)
 * @param {Function} onRefresh           - 삭제 실패 시 데이터 재로드 콜백
 */
export function useSampleBatchMode(onDeletedOptimistic, onRefresh) {
  const [batchMode, setBatchMode] = useState(false);
  const [selected,  setSelected]  = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggleSelect(id) {
    setSelected(prev => toggleSampleSelection(prev, id));
  }

  function exitBatchMode() {
    setBatchMode(false);
    setSelected(new Set());
    setConfirmOpen(false);
  }

  function handleBatchDelete() {
    if (toSampleSelectionIds(selected).length === 0) return;
    setConfirmOpen(true);
  }

  async function confirmBatchDelete() {
    const ids = toSampleSelectionIds(selected);
    if (ids.length === 0) {
      setConfirmOpen(false);
      return;
    }
    onDeletedOptimistic?.(ids);
    exitBatchMode();
    try {
      await Promise.all(ids.map(id => deleteSample(id)));
      showToast(`${ids.length}개 샘플 삭제됨`, 'ok');
    } catch {
      showToast('일부 삭제 실패', 'error');
      onRefresh?.();
    }
  }

  return {
    batchMode,
    setBatchMode,
    selected,
    toggleSelect,
    exitBatchMode,
    handleBatchDelete,
    confirmOpen,
    setConfirmOpen,
    confirmBatchDelete,
  };
}
