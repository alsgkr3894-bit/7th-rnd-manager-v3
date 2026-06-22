'use client';
import { showToast } from '@/components/Toast';
import { logMenuMasterSave, logMenuMasterDelete } from '@/lib/change-log';
import {
  deleteMenuMaster,
  getMenuDeletePlan,
  resetAllMenuMaster,
  pushMasterToPrices,
  upsertMenuMaster,
} from '@/lib/menu-master';
import { resetAllMenuPrices } from '@/lib/cost/menu-price';
import { seedMenuMaster } from '@/lib/menu-master/seed';

export function useMenuMasterActions({
  reload,
  setDeleteTarget,
  setDeletePlan,
  setDeletePlanLoading,
  setSeeding,
  setResetting,
  setEditRow,
  setAddOpen,
  canEdit = false,
}) {
  function requireEdit() {
    if (canEdit) return true;
    showToast('관리자 권한이 필요합니다', 'error');
    return false;
  }

  async function syncMirror() {
    try {
      await pushMasterToPrices({ skipAdminGuard: true });
    } catch (err) {
      console.warn('판매가 미러 동기화 실패:', err);
    }
  }

  async function handleDeleteRow(row) {
    if (!requireEdit()) return;
    try {
      const result = await deleteMenuMaster(row.id);
      if (result?.cascadeErrors?.length) {
        showToast(
          `"${row.menuName}" 삭제됨 · 연관 영양 데이터 정리 ${result.cascadeErrors.length}건 확인 필요`,
          'warn'
        );
      } else {
        showToast(`"${row.menuName}" 삭제됨`, 'ok');
      }
      logMenuMasterDelete(row.menuName || row.menuCode || '메뉴');
      setDeleteTarget(null);
      await syncMirror();
      reload();
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }

  async function openDeleteDialog(row) {
    if (!requireEdit()) return;
    setDeleteTarget(row);
    setDeletePlan(null);
    setDeletePlanLoading(true);
    try {
      const plan = await getMenuDeletePlan(row.id);
      setDeletePlan(plan);
    } catch (err) {
      console.warn('[menu-master] 삭제 영향 계산 실패', err);
      setDeletePlan(null);
    } finally {
      setDeletePlanLoading(false);
    }
  }

  async function handleResetAndSeed() {
    if (!requireEdit()) return;
    setResetting(true);
    try {
      await resetAllMenuMaster();
      await resetAllMenuPrices();
      reload();
      showToast('초기화 완료', 'ok');
    } catch (err) {
      showToast('실패: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  async function handleSeed() {
    if (!requireEdit()) return;
    setSeeding(true);
    try {
      const { inserted } = await seedMenuMaster();
      await syncMirror();
      reload();
      showToast(`${inserted}개 등록 완료`, 'ok');
    } catch (err) {
      showToast('등록 실패: ' + err.message, 'error');
    } finally {
      setSeeding(false);
    }
  }

  async function handleSaveRow(data, options = {}) {
    if (!requireEdit()) return null;
    const { closeModal = true, reloadAfter = true, toast = true, throwOnError = false } = options;
    try {
      const result = await upsertMenuMaster(data);
      await syncMirror();
      if (reloadAfter) reload();
      if (closeModal) {
        setEditRow(null);
        setAddOpen(false);
      }
      if (!toast) return result;
      if (result.mode === 'update' && !data.id) {
        showToast(`기존 항목(${data.menuCode}) 갱신됨 — 새 항목으로 추가되지 않았습니다`, 'warn');
      } else {
        showToast('저장 완료', 'ok');
      }
      logMenuMasterSave(data.menuName || data.menuCode || '메뉴', result.mode === 'insert');
      return result;
    } catch (err) {
      if (toast) showToast('저장 실패: ' + err.message, 'error');
      if (throwOnError) throw err;
      return null;
    }
  }

  return { handleDeleteRow, openDeleteDialog, handleResetAndSeed, handleSeed, handleSaveRow };
}
