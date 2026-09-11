'use client';
import { useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  getAllMenuMaster,
  upsertMenuMaster,
  deleteMenuMaster,
  pushMasterToPrices,
} from '@/lib/menu-master';
import { loadLatestUnitPriceMap } from '@/lib/menu-master/recipe-summary';
import { loadMenuRecipeMaps, upsertMenuRecipeForMenu } from '@/lib/menu-recipes';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllToppings } from '@/lib/nutrition/values/topping';
import { buildToppingRecipePrefillPlan } from '@/lib/menu-master/topping-recipe-prefill';
import { generateMenuCode } from '@/lib/cost/menu-price';
import { MENU_CATEGORY } from '@/lib/menu-categories';
import { logMenuMasterSave, logMenuMasterDelete } from '@/lib/change-log';
import {
  buildToppingCostRows,
  buildToppingMenuPatch,
  buildToppingRecipePatch,
} from '@/lib/cost/topping/rows';
import { ToppingCostTable } from '@/components/cost/topping/ToppingCostTable';

export default function Page() {
  const { isViewer } = useCurrentRole();
  const canEdit = !isViewer;

  const { data, loading, errorMessage, reload } = useDBLoad(async () => {
    const [menus, recipeMaps, ingredients, unitPriceMap, toppings] = await Promise.all([
      getAllMenuMaster(),
      loadMenuRecipeMaps(),
      getAllIngredients(),
      loadLatestUnitPriceMap(),
      getAllToppings(),
    ]);
    return { menus, recipeMap: recipeMaps.topping, ingredients, unitPriceMap, toppings };
  });

  const rows = data
    ? buildToppingCostRows({
        menus: data.menus,
        recipeMap: data.recipeMap,
        unitPriceMap: data.unitPriceMap,
      })
    : [];

  const requireEdit = useCallback(() => {
    if (canEdit) return true;
    showToast('관리자 권한이 필요합니다', 'error');
    return false;
  }, [canEdit]);

  const handleAddRow = useCallback(async () => {
    if (!requireEdit()) return;
    try {
      const existingMenus = await getAllMenuMaster();
      const menuCode = generateMenuCode(
        { category: MENU_CATEGORY.EXTRA_TOPPING, size: '단일', menuName: '새 토핑' },
        existingMenus
      );
      await upsertMenuMaster({
        menuCode,
        menuName: '새 토핑',
        category: MENU_CATEGORY.EXTRA_TOPPING,
        size: null,
        status: 'active',
        price: null,
        source: 'topping-cost',
      });
      await pushMasterToPrices({ skipAdminGuard: true });
      logMenuMasterSave('새 토핑', true);
      reload();
      showToast('토핑 1건 추가됨 — 이름·식자재·수량·판매가를 입력해 주세요', 'ok');
    } catch (err) {
      showToast('추가 실패: ' + err.message, 'error');
    }
  }, [requireEdit, reload]);

  const handlePrefill = useCallback(async () => {
    if (!requireEdit()) return;
    try {
      const [menus, recipeMaps, unitPriceMap, toppings] = await Promise.all([
        getAllMenuMaster(),
        loadMenuRecipeMaps(),
        loadLatestUnitPriceMap(),
        getAllToppings(),
      ]);
      const plan = buildToppingRecipePrefillPlan(toppings, menus, recipeMaps.topping, unitPriceMap);
      if (plan.length === 0) {
        showToast('연결할 새 식자재가 없습니다(이미 모두 연결됨)', 'ok');
        return;
      }
      for (const draft of plan) {
        await upsertMenuRecipeForMenu(draft);
      }
      reload();
      showToast(`${plan.length}건 식자재 연결됨 — 수량·판매가를 확인해 주세요`, 'ok');
    } catch (err) {
      showToast('식자재 연결 실패: ' + err.message, 'error');
    }
  }, [requireEdit, reload]);

  const handleMenuSave = useCallback(
    async (row, changes) => {
      if (!requireEdit()) return;
      try {
        await upsertMenuMaster(buildToppingMenuPatch(row, changes));
        await pushMasterToPrices({ skipAdminGuard: true });
        logMenuMasterSave(changes.menuName ?? row.menuName, false);
        reload();
      } catch (err) {
        showToast('저장 실패: ' + err.message, 'error');
      }
    },
    [requireEdit, reload]
  );

  const handleRecipeSave = useCallback(
    async (row, componentChanges) => {
      if (!requireEdit()) return;
      try {
        await upsertMenuRecipeForMenu(buildToppingRecipePatch(row, componentChanges));
        reload();
      } catch (err) {
        showToast('저장 실패: ' + err.message, 'error');
      }
    },
    [requireEdit, reload]
  );

  const handleDeleteRow = useCallback(
    async row => {
      if (!requireEdit()) return;
      try {
        await deleteMenuMaster(row.id);
        await pushMasterToPrices({ skipAdminGuard: true });
        logMenuMasterDelete(row.menuName);
        reload();
        showToast('삭제됨', 'ok');
      } catch (err) {
        showToast('삭제 실패: ' + err.message, 'error');
      }
    },
    [requireEdit, reload]
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '추가토핑 원가']}
        title="추가토핑 원가"
        sub="주문 시 추가로 얹는 토핑(예: 치즈 100g 추가)의 수량·판매가·원가율을 관리합니다."
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" onClick={handlePrefill} disabled={!canEdit}>
              <Icon.download style={{ width: 13, height: 13 }} />
              토핑마스터에서 식자재 불러오기
            </button>
            <button className="btn primary" onClick={handleAddRow} disabled={!canEdit}>
              <Icon.plus style={{ width: 13, height: 13 }} /> 토핑 추가
            </button>
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: 24, color: 'var(--text-3)' }}>불러오는 중…</div>
      ) : errorMessage ? (
        <div style={{ padding: 24, color: 'var(--negative)' }}>{errorMessage}</div>
      ) : (
        <ToppingCostTable
          rows={rows}
          allIngredients={data?.ingredients || []}
          unitPriceMap={data?.unitPriceMap || new Map()}
          canEdit={canEdit}
          onMenuSave={handleMenuSave}
          onRecipeSave={handleRecipeSave}
          onDeleteRow={handleDeleteRow}
        />
      )}
    </main>
  );
}
