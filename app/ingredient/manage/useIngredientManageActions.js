'use client';
import { useCallback } from 'react';
import { showToast } from '@/components/Toast';
import { logIngredientSave, logIngredientDelete, logIngredientBulkDelete } from '@/lib/change-log';
import {
  addIngredient,
  updateIngredient,
  setIngredientPriceManualConfirmed,
  upsertIngredientMeta,
  excludeIngredientByCode,
  restoreIngredientByCode,
  deleteIngredient,
  resetAllIngredients,
  repairIngredientProductCodeDuplicates,
  removeCategoryFromAll,
  removeTagFromAll,
  removeManyTagsFromAll,
  renameCategoryInAll,
  renameTagInAll,
  bulkSetDiscontinued,
  bulkSetCategory,
  bulkDeleteIngredients,
  replaceIngredientProductCode,
} from '@/lib/ingredient';
import {
  syncManagedScope,
  restoreDeletedIngredientBackup,
  restoreDeletedIngredientBackups,
  warnIngredientCascadeFailures,
  buildBulkDeleteToast,
} from './ingredientManageUtils';

/**
 * 식자재관리 핸들러 훅.
 * 저장·삭제·복원·시드·초기화·일괄삭제·필터 핸들러를 반환한다.
 */
export function useIngredientManageActions({
  load,
  setRows,
  formTarget,
  setFormTarget,
  resetting,
  setResetting,
  setResetConfirm,
  setDeletePending,
  dedupeBusy,
  setDedupeBusy,
  setDedupeConfirm,
  selected,
  exitBatch,
  clearSelection,
  setCatFilter,
  setTagFilter,
  canEdit = false,
}) {
  async function handleReset() {
    if (!canEdit) return;
    if (resetting) return;
    setResetting(true);
    try {
      const result = await resetAllIngredients();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false);
      await load();
    } catch (err) {
      showToast('초기화 실패: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  async function handleRemoveCategory(cat) {
    if (!canEdit) return;
    try {
      const { updated } = await removeCategoryFromAll(cat);
      showToast(`'${cat}' 분류 삭제 — ${updated}개 항목 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  async function handleRemoveTag(tag) {
    if (!canEdit) return;
    try {
      const { updated } = await removeTagFromAll(tag);
      showToast(`'#${tag}' 태그 삭제 — ${updated}개 항목 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  async function handleRemoveAllUnusedTags(tags) {
    if (!canEdit) return;
    try {
      const { updated } = await removeManyTagsFromAll(tags);
      showToast(`미사용 태그 ${tags.length}개 일괄 삭제 — ${updated}개 식자재 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('일괄 삭제 실패: ' + e.message, 'error');
    }
  }

  async function handleRepairProductCodeDuplicates() {
    if (!canEdit) return;
    if (dedupeBusy) return;
    setDedupeBusy(true);
    try {
      const result = await repairIngredientProductCodeDuplicates();
      showToast(`제품코드 중복 ${result.removed || 0}건 정리 완료`, 'ok');
      setDedupeConfirm(false);
      await load();
    } catch (err) {
      showToast('중복 정리 실패: ' + err.message, 'error');
    } finally {
      setDedupeBusy(false);
    }
  }

  const handleSave = useCallback(
    async formData => {
      if (!canEdit) return;
      try {
        const name =
          formData.ingredientName || formData.displayName || formData.productCode || '식자재';
        if (formTarget === 'new' || formTarget?.__copyFrom) {
          await addIngredient(formData);
          logIngredientSave(name, true);
          showToast('식자재 추가 완료', 'ok');
        } else if (formTarget.isManual && formTarget.id) {
          await updateIngredient(formTarget.id, formData);
          logIngredientSave(name, false);
          showToast('저장 완료', 'ok');
        } else {
          if (!formTarget.productCode)
            throw new Error('제때 연동 항목에 productCode가 없습니다. 데이터를 확인해 주세요.');
          await upsertIngredientMeta({ productCode: formTarget.productCode, ...formData });
          await syncManagedScope(formTarget, formData.scope);
          logIngredientSave(name, false);
          showToast('저장 완료', 'ok');
        }
        setFormTarget(null);
        await load();
      } catch (err) {
        showToast('저장 실패: ' + err.message, 'error');
        throw err;
      }
    },
    [canEdit, formTarget, load, setFormTarget]
  );

  const handleExclude = useCallback(
    async row => {
      if (!canEdit) return false;
      try {
        if (row.isManual && row.id && !row.productCode) {
          const backup = await deleteIngredient(row.id);
          warnIngredientCascadeFailures([backup]);
          setRows(prev => prev.filter(r => !(r.isManual && r.id === row.id)));
          logIngredientDelete(row.ingredientName || row.displayName || '식자재');
          showToast(`"${row.ingredientName || row.displayName || '식자재'}" 삭제됨`, 'ok', 5000, {
            label: '실행취소',
            onClick: async () => {
              try {
                await restoreDeletedIngredientBackup(backup);
                await load();
                showToast('삭제를 되돌렸습니다', 'ok');
              } catch (err) {
                console.error('[IngredientManage] undo delete failed', err);
                showToast('실행취소 실패: ' + err.message, 'error');
              }
            },
          });
        } else {
          await excludeIngredientByCode(row.productCode);
          setRows(prev =>
            prev.map(r =>
              r.productCode === row.productCode ? { ...r, excluded: true, hasRecord: true } : r
            )
          );
          showToast('숨겼습니다', 'ok');
        }
        setDeletePending(null);
        return true;
      } catch (err) {
        showToast('실패: ' + err.message, 'error');
        return false;
      }
    },
    [canEdit, load, setRows, setDeletePending]
  );

  const handleRestore = useCallback(
    async productCode => {
      if (!canEdit) return;
      try {
        await restoreIngredientByCode(productCode);
        setRows(prev =>
          prev.map(r => (r.productCode === productCode ? { ...r, excluded: false } : r))
        );
        showToast('복원됐습니다', 'ok');
      } catch (err) {
        showToast('실패: ' + err.message, 'error');
      }
    },
    [canEdit, setRows]
  );

  const handleConfirmPriceManual = useCallback(
    async row => {
      if (!canEdit || !row?.id) return;
      try {
        await setIngredientPriceManualConfirmed(row.id, true);
        setRows(prev =>
          prev.map(r => (r.id === row.id ? { ...r, priceManualConfirmed: true } : r))
        );
        showToast('단가 미연동 확인 처리했습니다', 'ok');
      } catch (err) {
        showToast('실패: ' + err.message, 'error');
      }
    },
    [canEdit, setRows]
  );

  const handleAutoRegister = useCallback(
    async row => {
      if (!canEdit) return;
      try {
        await addIngredient({
          ingredientName: row.displayName || row.productName || '',
          productCode: row.productCode || '',
          category: '',
          tags: [],
          isManual: true,
        });
        showToast(`${row.displayName || row.productName} 등록됨`, 'ok');
        await load();
      } catch (err) {
        showToast('등록 실패: ' + err.message, 'error');
      }
    },
    [canEdit, load]
  );

  const handleReplaceJetteProduct = useCallback(
    async (row, replacement) => {
      if (!canEdit) return;
      try {
        const result = await replaceIngredientProductCode(row?.productCode, replacement);
        showToast(
          `대체 연결 완료 · 레시피 ${result.menuRecipeUpdated}건 · 식자재 묶음 ${result.recipeGroupUpdated}건 · 엣지 도우 ${result.edgeUpdated}건`,
          'ok'
        );
        await load();
      } catch (err) {
        showToast('대체 연결 실패: ' + err.message, 'error');
      }
    },
    [canEdit, load]
  );

  const handleBatchDelete = useCallback(async () => {
    if (!canEdit) return;
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const { removed, failures } = await bulkDeleteIngredients(ids);
      warnIngredientCascadeFailures(removed);
      if (removed.length > 0) {
        const removedIds = new Set(removed.map(rec => rec.ingredient?.id).filter(Boolean));
        setRows(prev => prev.filter(r => !removedIds.has(r.id)));
        exitBatch();
      }
      if (removed.length > 0) logIngredientBulkDelete(removed.length);
      const toast = buildBulkDeleteToast(removed, failures);
      const undoAction =
        removed.length > 0
          ? {
              label: '실행취소',
              onClick: async () => {
                try {
                  await restoreDeletedIngredientBackups(removed);
                  await load();
                  showToast(`${removed.length}개 복구했습니다`, 'ok');
                } catch (err) {
                  console.error('[IngredientManage] undo batch delete failed', err);
                  showToast('실행취소 실패: ' + err.message, 'error');
                }
              },
            }
          : null;
      showToast(toast.message, toast.type, 5000, undoAction);
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }, [canEdit, selected, load, exitBatch, setRows]);

  const handleSetCatFilter = useCallback(
    val => {
      setCatFilter(val);
      clearSelection();
    },
    [clearSelection, setCatFilter]
  );

  const handleSetTagFilter = useCallback(
    val => {
      setTagFilter(val);
      clearSelection();
    },
    [clearSelection, setTagFilter]
  );

  const handleDeleteCancel = useCallback(() => setDeletePending(null), [setDeletePending]);

  async function handleRenameCategory(oldName, newName) {
    if (!canEdit) return;
    try {
      const { updated } = await renameCategoryInAll(oldName, newName);
      showToast(`'${oldName}' → '${newName}' 분류 이름 변경 — ${updated}개 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('이름 변경 실패: ' + e.message, 'error');
    }
  }

  async function handleRenameTag(oldName, newName) {
    if (!canEdit) return;
    try {
      const { updated } = await renameTagInAll(oldName, newName);
      showToast(`'#${oldName}' → '#${newName}' 태그 이름 변경 — ${updated}개 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('이름 변경 실패: ' + e.message, 'error');
    }
  }

  const handleBulkDiscontinue = useCallback(
    async discontinued => {
      if (!canEdit) return;
      try {
        const ids = [...selected];
        if (!ids.length) return;
        const { updated } = await bulkSetDiscontinued(ids, discontinued);
        showToast(`${updated}개 식자재 ${discontinued ? '단종' : '단종 복구'} 처리됨`, 'ok');
        await load();
        exitBatch();
        clearSelection();
      } catch (err) {
        showToast('실패: ' + err.message, 'error');
      }
    },
    [canEdit, selected, load, exitBatch, clearSelection]
  );

  const handleBulkSetCategory = useCallback(
    async newCategory => {
      if (!canEdit) return;
      try {
        const ids = [...selected];
        if (!ids.length) return;
        const { updated } = await bulkSetCategory(ids, newCategory);
        showToast(`${updated}개 식자재 분류 → '${newCategory || '(없음)'}' 변경됨`, 'ok');
        await load();
        exitBatch();
        clearSelection();
      } catch (err) {
        showToast('실패: ' + err.message, 'error');
      }
    },
    [canEdit, selected, load, exitBatch, clearSelection]
  );

  return {
    handleReset,
    handleRemoveCategory,
    handleRemoveTag,
    handleRemoveAllUnusedTags,
    handleRenameCategory,
    handleRenameTag,
    handleRepairProductCodeDuplicates,
    handleSave,
    handleExclude,
    handleRestore,
    handleConfirmPriceManual,
    handleAutoRegister,
    handleReplaceJetteProduct,
    handleBatchDelete,
    handleBulkDiscontinue,
    handleBulkSetCategory,
    handleSetCatFilter,
    handleSetTagFilter,
    handleDeleteCancel,
  };
}
