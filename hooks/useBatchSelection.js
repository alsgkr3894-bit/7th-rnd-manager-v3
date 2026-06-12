'use client';
import { useCallback, useState } from 'react';

export function useBatchSelection() {
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const startBatch = useCallback(() => {
    setBatchMode(true);
    setSelected(new Set());
  }, []);

  const exitBatch = useCallback(() => {
    setBatchMode(false);
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback(id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    batchMode,
    selected,
    setBatchMode,
    setSelected,
    clearSelection,
    startBatch,
    exitBatch,
    toggleSelect,
  };
}
