'use client';
import { useCallback } from 'react';
import { showToast } from '@/components/Toast';
import {
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  excludeIngredientByCode,
  restoreIngredientByCode,
  deleteIngredient,
  seedMasterIngredients,
  INGREDIENT_MASTER_SEED,
  resetAllIngredients,
  repairIngredientProductCodeDuplicates,
  removeCategoryFromAll,
  removeTagFromAll,
  bulkDeleteIngredients,
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
  seeding,
  setSeeding,
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
}) {
  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedMasterIngredients(INGREDIENT_MASTER_SEED);
      showToast(`마스터 시드 적용 완료 — 신규 ${result.inserted} · 갱신 ${result.updated}`, 'ok');
      await load();
    } catch (err) {
      showToast('시드 실패: ' + err.message, 'error');
    } finally {
      setSeeding(false);
    }
  }

  async function handleReset() {
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
    try {
      const { updated } = await removeCategoryFromAll(cat);
      showToast(`'${cat}' 분류 삭제 — ${updated}개 항목 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  async function handleRemoveTag(tag) {
    try {
      const { updated } = await removeTagFromAll(tag);
      showToast(`'#${tag}' 태그 삭제 — ${updated}개 항목 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  async function handleRepairProductCodeDuplicates() {
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
      try {
        if (formTarget === 'new' || formTarget?.__copyFrom) {
          await addIngredient(formData);
          showToast('식자재 추가 완료', 'ok');
        } else if (formTarget.isManual && formTarget.id) {
          await updateIngredient(formTarget.id, formData);
          showToast('저장 완료', 'ok');
        } else {
          if (!formTarget.productCode)
            throw new Error('제때 연동 항목에 productCode가 없습니다. 데이터를 확인해 주세요.');
          await upsertIngredientMeta({ productCode: formTarget.productCode, ...formData });
          await syncManagedScope(formTarget, formData.scope);
          showToast('저장 완료', 'ok');
        }
        setFormTarget(null);
        await load();
      } catch (err) {
        showToast('저장 실패: ' + err.message, 'error');
        throw err;
      }
    },
    [formTarget, load, setFormTarget]
  );

  const handleExclude = useCallback(
    async row => {
      try {
        if (row.isManual && row.id && !row.productCode) {
          const backup = await deleteIngredient(row.id);
          warnIngredientCascadeFailures([backup]);
          setRows(prev => prev.filter(r => !(r.isManual && r.id === row.id)));
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
      } catch (err) {
        showToast('실패: ' + err.message, 'error');
      }
    },
    [load, setRows, setDeletePending]
  );

  const handleRestore = useCallback(
    async productCode => {
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
    [setRows]
  );

  const handleAutoRegister = useCallback(
    async row => {
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
    [load]
  );

  const handleBatchDelete = useCallback(async () => {
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
  }, [selected, load, exitBatch, setRows]);

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

  return {
    handleSeed,
    handleReset,
    handleRemoveCategory,
    handleRemoveTag,
    handleRepairProductCodeDuplicates,
    handleSave,
    handleExclude,
    handleRestore,
    handleAutoRegister,
    handleBatchDelete,
    handleSetCatFilter,
    handleSetTagFilter,
    handleDeleteCancel,
  };
}
