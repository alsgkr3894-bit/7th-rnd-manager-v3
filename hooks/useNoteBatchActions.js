import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteNote, updateNote, updateNoteChainStatus } from '@/lib/note';
import { buildNoteDropMergePlan, buildNoteMergePlan, buildNoteUnmergePlan } from '@/lib/note/merge';
import { isUnifiedSampleId, unifiedSampleSourceId } from '@/lib/note/unified-records';
import { deleteSample } from '@/lib/sample';

function splitUnifiedIds(ids = []) {
  const sampleIds = [];
  const noteIds = [];
  for (const id of ids) {
    if (isUnifiedSampleId(id)) sampleIds.push(id);
    else noteIds.push(id);
  }
  return { sampleIds, noteIds };
}

function hasUnifiedSampleIds(ids = []) {
  return ids.some(id => isUnifiedSampleId(id));
}

export function useNoteBatchActions({ notes = [], setNotes, load, canEdit = false }) {
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [pendingDropMerge, setPendingDropMerge] = useState(null);
  const [pendingUnmerge, setPendingUnmerge] = useState(null);

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
    if (hasUnifiedSampleIds([...selected])) {
      showToast('샘플/제품이슈 기록은 노트 차수 묶기에 포함할 수 없어요', 'warn');
      return;
    }
    setConfirmMerge(true);
  }

  async function handleBatchStatusChange(newStatus) {
    if (!canEdit || selected.size === 0) return;
    const ids = [...selected];
    if (hasUnifiedSampleIds(ids)) {
      showToast('샘플/제품이슈 기록은 노트 상태 일괄변경에서 제외해 주세요', 'warn');
      return;
    }
    try {
      const changedIds = await Promise.all(ids.map(id => updateNoteChainStatus(id, newStatus)));
      const changedSet = new Set(changedIds.flat());
      setNotes(prev => prev.map(n => (changedSet.has(n.id) ? { ...n, status: newStatus } : n)));
      showToast(`${changedSet.size}개 차수의 메뉴 상태 → ${newStatus}`, 'ok');
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
    const { sampleIds, noteIds } = splitUnifiedIds(ids);
    setSelected(new Set());
    setBatchMode(false);
    // deleteNote는 삭제된 원본 배열(부모+cascade 자식)을 반환한다. 화면에서 cascade로 사라진
    // 자식까지 제거하려면 선택 id뿐 아니라 반환된 모든 id로 필터해야 한다(유령 행 방지).
    const removedIds = new Set();
    const failures = [];
    const CHUNK = 10;
    for (let i = 0; i < noteIds.length; i += CHUNK) {
      const results = await Promise.all(
        noteIds.slice(i, i + CHUNK).map(async id => {
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
    for (let i = 0; i < sampleIds.length; i += CHUNK) {
      await Promise.all(
        sampleIds.slice(i, i + CHUNK).map(async id => {
          try {
            await deleteSample(unifiedSampleSourceId(id));
            removedIds.add(id);
          } catch (err) {
            failures.push({ id, message: err?.message || String(err) });
            console.error('[useNoteBatchActions] confirmBatchDelete sample', id, err);
          }
        })
      );
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
    if (hasUnifiedSampleIds([...selected])) {
      showToast('샘플/제품이슈 기록은 노트 차수 묶기에 포함할 수 없어요', 'warn');
      return;
    }
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
      showToast(
        `${plan.mergedCount || plan.selectedCount}개 노트를 "${plan.title}" 차수로 묶었어요`,
        'ok'
      );
      setSelected(new Set());
      setBatchMode(false);
      load();
    } catch (err) {
      console.error('[useNoteBatchActions] confirmBatchMerge', err);
      showToast('차수 묶기 실패', 'error');
      load();
    }
  }

  async function handleDropMerge(sourceIds, targetIds) {
    if (!canEdit) return;
    if (hasUnifiedSampleIds([...(sourceIds || []), ...(targetIds || [])])) {
      showToast('샘플/제품이슈 기록은 노트 차수 드래그 병합에 포함할 수 없어요', 'warn');
      return;
    }
    const plan = buildNoteDropMergePlan(notes, sourceIds, targetIds);
    if (!plan.canMerge) {
      showToast(plan.reason || '카드를 다시 끌어 넣어주세요', 'warn');
      return;
    }
    setPendingDropMerge(plan);
  }

  async function confirmDropMerge() {
    const plan = pendingDropMerge;
    setPendingDropMerge(null);
    if (!canEdit || !plan?.canMerge) return;
    try {
      for (const change of plan.changes) {
        await updateNote(change.id, change.patch);
      }
      const byId = new Map(plan.changes.map(change => [change.id, change.patch]));
      setNotes(prev =>
        prev.map(note => (byId.has(note.id) ? { ...note, ...byId.get(note.id) } : note))
      );
      showToast(`${plan.sourceCount}개 차수를 "${plan.title}" 뒤에 넣었어요`, 'ok');
      setSelected(new Set());
      setBatchMode(false);
      load();
    } catch (err) {
      console.error('[useNoteBatchActions] handleDropMerge', err);
      showToast('카드 차수 넣기 실패', 'error');
      load();
    }
  }

  function handleUnmergeGroup(noteIds) {
    if (!canEdit) return;
    if (hasUnifiedSampleIds(noteIds || [])) {
      showToast('샘플/제품이슈 기록은 노트 차수 분리 대상이 아니에요', 'warn');
      return;
    }
    const plan = buildNoteUnmergePlan(notes, noteIds);
    if (!plan.canUnmerge) {
      showToast(plan.reason || '분리할 차수 묶음이 없습니다', 'warn');
      return;
    }
    setPendingUnmerge(plan);
  }

  async function confirmUnmergeGroup() {
    const plan = pendingUnmerge;
    setPendingUnmerge(null);
    if (!canEdit || !plan?.canUnmerge) return;
    try {
      for (const change of plan.changes) {
        await updateNote(change.id, change.patch);
      }
      const byId = new Map(plan.changes.map(change => [change.id, change.patch]));
      setNotes(prev =>
        prev.map(note => (byId.has(note.id) ? { ...note, ...byId.get(note.id) } : note))
      );
      showToast(`${plan.unmergedCount}개 차수 묶음을 분리했어요`, 'ok');
      setSelected(new Set());
      setBatchMode(false);
      load();
    } catch (err) {
      console.error('[useNoteBatchActions] confirmUnmergeGroup', err);
      showToast('차수 묶음 분리 실패', 'error');
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
    pendingDropMerge,
    setPendingDropMerge,
    pendingUnmerge,
    setPendingUnmerge,
    toggleSelect,
    exitBatch,
    handleBatchDelete,
    handleBatchMerge,
    handleBatchStatusChange,
    confirmBatchDelete,
    confirmBatchMerge,
    handleDropMerge,
    confirmDropMerge,
    handleUnmergeGroup,
    confirmUnmergeGroup,
  };
}
