'use client';
import { showToast } from '@/components/Toast';
import { logWork } from '@/lib/work-log';
import { logMenuMasterSave, logMenuMasterDelete } from '@/lib/change-log';
import { summarizeMenuMasterChange } from '@/lib/menu-master/change-summary';
import {
  deleteMenuMaster,
  getAllMenuMaster,
  getMenuDeletePlan,
  resetAllMenuMaster,
  pushMasterToPrices,
  upsertMenuMaster,
} from '@/lib/menu-master';
import { resetAllMenuPrices } from '@/lib/cost/menu-price';
import { seedMenuMaster } from '@/lib/menu-master/seed';
import { buildToppingImportPlan } from '@/lib/menu-master/topping-import';
import { buildToppingRecipePrefillPlan } from '@/lib/menu-master/topping-recipe-prefill';
import { loadLatestUnitPriceMap } from '@/lib/menu-master/recipe-summary';
import { loadMenuRecipeMaps, upsertMenuRecipeForMenu } from '@/lib/menu-recipes';
import { getAllToppings } from '@/lib/nutrition/values/topping';

export function useMenuMasterActions({
  reload,
  setDeleteTarget,
  setDeletePlan,
  setDeletePlanLoading,
  setSeeding,
  setResetting,
  setImportingToppings,
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
      logWork('DELETE', `메뉴 삭제: ${row.menuName || row.menuCode || '메뉴'}`, { ref: row.id });
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

  /**
   * 영양 토핑 마스터(nutrition_topping_master)에 등록된 토핑을 메뉴마스터
   * 추가토핑 메뉴로 일괄 등록한다. 이미 등록된 이름은 건너뛰고(멱등 — 몇 번
   * 실행해도 중복 등록되지 않는다), 새로 등록되는 메뉴든 기존 메뉴든 아직
   * 식자재가 연결 안 된 것은 토핑마스터의 productCode로 함께 이어준다
   * (buildToppingRecipePrefillPlan — 사용자가 이미 입력한 구성품은 절대
   * 덮어쓰지 않는다). 판매가·사용량(수량)은 여전히 사용자가 직접 입력한다.
   */
  async function handleImportToppings() {
    if (!requireEdit()) return;
    if (setImportingToppings) setImportingToppings(true);
    try {
      const [toppings, existingMenus] = await Promise.all([getAllToppings(), getAllMenuMaster()]);
      const plan = buildToppingImportPlan(toppings, existingMenus);
      for (const draft of plan) {
        await upsertMenuMaster(draft);
      }

      const menusForPrefill = plan.length > 0 ? await getAllMenuMaster() : existingMenus;
      const [recipeMaps, unitPriceMap] = await Promise.all([
        loadMenuRecipeMaps(),
        loadLatestUnitPriceMap(),
      ]);
      const recipePlan = buildToppingRecipePrefillPlan(
        toppings,
        menusForPrefill,
        recipeMaps.topping,
        unitPriceMap
      );
      for (const draft of recipePlan) {
        await upsertMenuRecipeForMenu(draft);
      }

      if (plan.length === 0 && recipePlan.length === 0) {
        showToast('새로 가져올 토핑이 없습니다(이미 모두 등록·연결됨)', 'ok');
        return;
      }

      await syncMirror();
      reload();
      const parts = [];
      if (plan.length > 0) parts.push(`메뉴 ${plan.length}개 등록`);
      if (recipePlan.length > 0) parts.push(`식자재 ${recipePlan.length}건 연결`);
      showToast(`${parts.join(' · ')} — 판매가·사용량을 확인해 주세요`, 'ok');
    } catch (err) {
      showToast('가져오기 실패: ' + err.message, 'error');
    } finally {
      if (setImportingToppings) setImportingToppings(false);
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
      const summary = summarizeMenuMasterChange(
        result.previous,
        { menuName: data.menuName, price: data.price },
        result.mode
      );
      logWork('MENU_MASTER', summary, { ref: result.id });
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

  return {
    handleDeleteRow,
    openDeleteDialog,
    handleResetAndSeed,
    handleSeed,
    handleImportToppings,
    handleSaveRow,
  };
}
