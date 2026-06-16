'use client';
import { showToast } from '@/components/Toast';
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
}) {
  async function syncMirror() {
    try {
      await pushMasterToPrices();
    } catch (err) {
      console.warn('판매가 미러 동기화 실패:', err);
    }
  }

  async function handleDeleteRow(row) {
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
      setDeleteTarget(null);
      await syncMirror();
      reload();
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }

  async function openDeleteDialog(row) {
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

  async function handleSaveRow(data) {
    try {
      const result = await upsertMenuMaster(data);
      await syncMirror();
      reload();
      setEditRow(null);
      setAddOpen(false);
      if (result.mode === 'update' && !data.id) {
        showToast(`기존 항목(${data.menuCode}) 갱신됨 — 새 항목으로 추가되지 않았습니다`, 'warn');
      } else {
        showToast('저장 완료', 'ok');
      }
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'error');
    }
  }

  return { handleDeleteRow, openDeleteDialog, handleResetAndSeed, handleSeed, handleSaveRow };
}
