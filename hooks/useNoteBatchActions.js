import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteNote, updateNote } from '@/lib/note';
import { buildNoteMergePlan } from '@/lib/note/merge';

export function useNoteBatchActions({ notes = [], setNotes, load, canEdit = false }) {
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);

  function toggleSelect(id) {
    if (!canEdit) return;
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
    if (!canEdit || selected.size === 0) return;
    setConfirmBatch(true);
  }

  function handleBatchMerge() {
    if (!canEdit) return;
    if (selected.size < 2) {
      showToast('차수로 묶을 노트를 2개 이상 선택해주세요', 'warn');
      return;
    }
    setConfirmMerge(true);
  }

  async function handleBatchStatusChange(newStatus) {
    if (!canEdit || selected.size === 0) return;
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
    if (!canEdit) return;
    const ids = [...selected];
    setSelected(new Set());
    setBatchMode(false);
    // deleteNote는 삭제된 원본 배열(부모+cascade 자식)을 반환한다. 화면에서 cascade로 사라진
    // 자식까지 제거하려면 선택 id뿐 아니라 반환된 모든 id로 필터해야 한다(유령 행 방지).
    const removedIds = new Set();
    const failures = [];
    const CHUNK = 10;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const results = await Promise.all(
        ids.slice(i, i + CHUNK).map(async id => {
          try {
            const removed = await deleteNote(id);
            return Array.isArray(removed) ? removed : removed ? [removed] : [];
          } catch (err) {
            // 부모/자식 동시 선택 시 자식이 부모 cascade로 이미 삭제됐을 수 있다 —
            // '찾을 수 없음'은 실패가 아니라 이미 처리된 것으로 간주.
            if (/찾을 수 없/.test(err?.message || '')) return [];
            failures.push({ id, message: err?.message || String(err) });
            console.error('[useNoteBatchActions] confirmBatchDelete', id, err);
            return [];
          }
        })
      );
      results.flat().forEach(rec => rec?.id != null && removedIds.add(rec.id));
    }
    setNotes(prev => prev.filter(n => !removedIds.has(n.id) && !ids.includes(n.id)));
    if (failures.length > 0) {
      showToast(`${ids.length - failures.length}개 삭제 · ${failures.length}개 실패`, 'warn');
      load();
    } else {
      showToast(`${ids.length}개 삭제됨`, 'ok');
    }
  }

  async function confirmBatchMerge() {
    setConfirmMerge(false);
    if (!canEdit) return;
    const plan = buildNoteMergePlan(notes, selected);
    if (!plan.canMerge) {
      showToast(plan.reason || '차수로 묶을 노트를 다시 선택해주세요', 'warn');
      return;
    }
    try {
      for (const change of plan.changes) {
        await updateNote(change.id, change.patch);
      }
      const byId = new Map(plan.changes.map(change => [change.id, change.patch]));
      setNotes(prev =>
        prev.map(note => (byId.has(note.id) ? { ...note, ...byId.get(note.id) } : note))
      );
      showToast(`${plan.selectedCount}개 노트를 "${plan.title}" 차수로 묶었어요`, 'ok');
      setSelected(new Set());
      setBatchMode(false);
      load();
    } catch (err) {
      console.error('[useNoteBatchActions] confirmBatchMerge', err);
      showToast('차수 묶기 실패', 'error');
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
    confirmMerge,
    setConfirmMerge,
    toggleSelect,
    exitBatch,
    handleBatchDelete,
    handleBatchMerge,
    handleBatchStatusChange,
    confirmBatchDelete,
    confirmBatchMerge,
  };
}
