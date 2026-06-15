import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteNote, updateNote } from '@/lib/note';

export function useNoteBatchActions({ setNotes, load }) {
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);

  function toggleSelect(id) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function exitBatch() {
    setBatchMode(false);
    setSelected(new Set());
  }

  function handleBatchDelete() {
    if (selected.size === 0) return;
    setConfirmBatch(true);
  }

  async function handleBatchStatusChange(newStatus) {
    if (selected.size === 0) return;
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => updateNote(id, { status: newStatus })));
      setNotes(prev => prev.map(n => (ids.includes(n.id) ? { ...n, status: newStatus } : n)));
      showToast(`${ids.length}개 → ${newStatus}`, 'ok');
      setSelected(new Set());
      setBatchMode(false);
    } catch (err) {
      console.error('[useNoteBatchActions] handleBatchStatusChange', err);
      showToast('상태 변경 실패', 'error');
    }
  }

  async function confirmBatchDelete() {
    setConfirmBatch(false);
    const ids = [...selected];
    setSelected(new Set());
    setBatchMode(false);
    try {
      const CHUNK = 10;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await Promise.all(ids.slice(i, i + CHUNK).map(id => deleteNote(id)));
      }
      setNotes(prev => prev.filter(n => !ids.includes(n.id)));
      showToast(`${ids.length}개 삭제됨`, 'ok');
    } catch (err) {
      console.error('[useNoteBatchActions] confirmBatchDelete', err);
      showToast('일부 삭제 실패', 'error');
      load();
    }
  }

  return {
    batchMode,
    setBatchMode,
    selected,
    setSelected,
    confirmBatch,
    setConfirmBatch,
    toggleSelect,
    exitBatch,
    handleBatchDelete,
    handleBatchStatusChange,
    confirmBatchDelete,
  };
}
