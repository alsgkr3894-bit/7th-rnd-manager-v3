'use client';
import { useEffect, useState, useMemo } from 'react';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import { exportOriginToExcel } from '@/lib/nutrition/origin/export';
import { printOriginAll } from '@/lib/nutrition/origin/print';
import { showToast } from '@/components/Toast';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { MENU_ORDER_KEY, loadOrder } from '@/lib/nutrition/order';
import { loadIngredientNames, saveIngredientNames } from '@/lib/nutrition/ingredient-name-override';
import {
  buildOriginDeliverySheet,
  buildOriginFridgeSheet,
  buildOriginStatementSheet,
  buildOriginStoreSheet,
} from '@/lib/nutrition/origin/output-sheets';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { buildOriginsFromIngredients } from '@/lib/nutrition/origin/build';
import {
  OriginResultActions,
  OriginResultLoading,
  OriginResultSubTabs,
  OriginResultTopTabs,
} from './OriginResultControls';
import { OriginResultSheetContent } from './OriginResultTables';
import './origin-result.css';

export default function OriginResult() {
  const [origins, setOrigins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('store');
  const [exporting, setExporting] = useState(false);
  const [ingEditOpen, setIngEditOpen] = useState(false);
  const [ingOverrides, setIngOverrides] = useState(() => loadIngredientNames());
  const [menuOrder, setMenuOrder] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      await initDB();
      const overrides = loadMenuNames();
      const [ings, masters, groups, edges, recipeArrays] = await Promise.all([
        getAllIngredients(),
        getAllMenuMaster(),
        getAllRecipeGroups(),
        getAllEdges(),
        loadMenuRecipeArrays(),
      ]);
      const safeIngredients = asObjectArray(ings);
      const safeMenuMasters = asObjectArray(masters);
      const safeGroups = asObjectArray(groups);
      const safeEdges = asObjectArray(edges);
      const masterByCode = Object.fromEntries(
        safeMenuMasters.map(m => [asDisplayText(m.menuCode), m]).filter(([menuCode]) => menuCode)
      );
      const detailRecipes = tagDetailRecipes(
        asObjectArray(recipeArrays.pizza),
        asObjectArray(recipeArrays.personal),
        asObjectArray(recipeArrays.side),
        asObjectArray(recipeArrays.set)
      );
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        groups: safeGroups,
        edges: safeEdges,
      });
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(safeMenuMasters);
      if (!alive) return;
      setMenuOrder(loadOrder(MENU_ORDER_KEY));
      setOrigins(
        buildOriginsFromIngredients(
          safeIngredients,
          ingredientToMenus,
          excludedMenuCodes,
          excludedMenuNames,
          overrides,
          masterByCode
        )
      );
    })()
      .catch(err => {
        if (alive) console.error('[OriginResult] load failed', err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const sheet1 = useMemo(
    () => buildOriginStoreSheet(origins, menuOrder, ingOverrides),
    [origins, menuOrder, ingOverrides]
  );
  const sheet2 = useMemo(
    () => buildOriginFridgeSheet(origins, ingOverrides),
    [origins, ingOverrides]
  );
  const sheet3 = useMemo(
    () => buildOriginDeliverySheet(origins, ingOverrides, menuOrder),
    [origins, ingOverrides, menuOrder]
  );
  const sheet4 = useMemo(
    () => buildOriginStatementSheet(origins, ingOverrides),
    [origins, ingOverrides]
  );

  async function handleExcel() {
    if (!origins.length) {
      showToast('원산지 데이터가 없습니다', 'warn');
      return;
    }
    setExporting(true);
    try {
      await exportOriginToExcel({ sheet1, sheet2, sheet3, sheet4 });
      showToast('엑셀 다운로드 완료', 'ok');
    } catch (e) {
      showToast('엑셀 출력 실패: ' + asDisplayText(e?.message, '알 수 없는 오류'), 'error');
    } finally {
      setExporting(false);
    }
  }

  function handlePdf() {
    if (!origins.length) {
      showToast('원산지 데이터가 없습니다', 'warn');
      return;
    }
    printOriginAll({ sheet1, sheet2, sheet3, sheet4 });
  }

  if (loading) return <OriginResultLoading />;

  return (
    <div className="origin-result-wrap">
      <OriginResultTopTabs />
      <OriginResultSubTabs tab={tab} onTabChange={setTab} />
      <OriginResultActions
        exporting={exporting}
        onEditIngredientNames={() => setIngEditOpen(true)}
        onPdf={handlePdf}
        onExcel={handleExcel}
      />

      <OriginResultSheetContent
        tab={tab}
        sheet1={sheet1}
        sheet2={sheet2}
        sheet3={sheet3}
        sheet4={sheet4}
      />

      {ingEditOpen && (
        <MenuNameEditModal
          menus={asObjectArray(origins)
            .map(o => {
              const ingredientName = asDisplayText(o.ingredientName);
              return { menuCode: ingredientName, menuName: ingredientName };
            })
            .filter(menu => menu.menuCode)}
          overrides={ingOverrides}
          onApply={next => {
            saveIngredientNames(next);
            setIngOverrides(next);
          }}
          onClose={() => setIngEditOpen(false)}
        />
      )}
    </div>
  );
}
