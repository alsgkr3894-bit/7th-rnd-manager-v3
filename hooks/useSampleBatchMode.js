'use client';
import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteSample } from '@/lib/sample';

/**
 * 샘플 배치 삭제 모드의 선택 상태와 액션을 관리한다.
 *
 * @param {Function} onDeletedOptimistic - 낙관적 업데이트용 콜백 (ids => void)
 * @param {Function} onRefresh           - 삭제 실패 시 데이터 재로드 콜백
 */
export function useSampleBatchMode(onDeletedOptimistic, onRefresh) {
  const [batchMode, setBatchMode] = useState(false);
  const [selected,  setSelected]  = useState(new Set());

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitBatchMode() {
    setBatchMode(false);
    setSelected(new Set());
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 샘플을 삭제할까요?`)) return;
    const ids = [...selected];
    onDeletedOptimistic(ids);
    exitBatchMode();
    try {
      await Promise.all(ids.map(id => deleteSample(id)));
      showToast(`${ids.length}개 샘플 삭제됨`, 'ok');
    } catch {
      showToast('일부 삭제 실패', 'error');
      onRefresh();
    }
  }

  return { batchMode, setBatchMode, selected, toggleSelect, exitBatchMode, handleBatchDelete };
}
