'use client';
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState, useMemo, useRef } from 'react';
import { initDB } from '@/lib/db';
import {
  getAllMenuRefs,
  getRawValueMap,
  getAllEdges,
  getAllToppings,
  getAllSetCompositions,
} from '@/lib/nutrition/values/store';
import { getAllEdges as getCostEdges } from '@/lib/cost/edge-dough';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import {
  buildEdgeAllergenMap,
  buildMenuAllergenMap,
  buildToppingAllergenMap,
} from '@/lib/nutrition/allergen/aggregate';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import {
  loadLabelMenuNames,
  saveLabelMenuNames,
  loadMenuNames,
  applyMenuName,
} from '@/lib/nutrition/menu-name-override';
import { loadIngredientNames } from '@/lib/nutrition/ingredient-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { LABEL_MENU_ORDER_KEY, loadOrder, saveOrder } from '@/lib/nutrition/order';
import { loadSliceCounts, saveSliceCounts } from '@/lib/nutrition/slice-config';
import { buildOriginsFromIngredients } from '@/lib/nutrition/origin/build';
import { buildOriginStatementSheet } from '@/lib/nutrition/origin/output-sheets';
import { SliceConfigModal } from '@/components/nutrition/SliceConfigModal';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildPizzaSheet,
  buildPizzaSliceSheet,
  buildToppingSheet,
  buildSideSheet,
  buildSetHalfSheet,
  buildBeverageSheet,
  sortNutritionLabelMenus,
} from '@/lib/nutrition/label/build';
import { exportNutritionLabelToExcel } from '@/lib/nutrition/label/export';
import { printNutritionLabelAll } from '@/lib/nutrition/label/print';
import { showToast } from '@/components/Toast';
import {
  NutritionLabelActions,
  NutritionLabelLoading,
  NutritionLabelTabs,
  PizzaViewControls,
} from './NutritionLabelControls';
import { NutritionLabelTabContent } from './NutritionLabelTables';
import './origin-result.css';

export default function NutritionLabelResult() {
  const [tab, setTab] = useState('poster');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [pizzaSheet, setPizzaSheet] = useState([]);
  const [pizzaSliceSheet, setPizzaSliceSheet] = useState([]);
  const [toppingSheet, setToppingSheet] = useState([]);
  const [sideSheet, setSideSheet] = useState([]);
  const [setHalfSheet, setSetHalfSheet] = useState([]);
  const [beverageSheet, setBeverageSheet] = useState([]);
  const [originStatementSheet, setOriginStatementSheet] = useState([]);

  const [pizzaView, setPizzaView] = useState('150g'); // '150g' | 'slice'
  const [sliceCounts, setSliceCounts] = useState({});
  const [sliceModalOpen, setSliceModalOpen] = useState(false);
  const [menuNameEditOpen, setMenuNameEditOpen] = useState(false);
  const [menuNameOverrides, setMenuNameOverrides] = useState(() => loadLabelMenuNames());
  const [labelMenuOrder, setLabelMenuOrder] = useState(() => loadOrder(LABEL_MENU_ORDER_KEY));
  const [menuNameEditMenus, setMenuNameEditMenus] = useState([]);
  const [labelContext, setLabelContext] = useState(null);
  const ctxRef = useRef(null); // { menus, rawMap, edgeMap, masterByCode, menuAllergenMap, edgeAllergenMap }

  // 조각 시트 재계산 (sliceCounts 변경 시 DB 재조회 없이)
  const rebuildSliceSheet = counts => {
    const c = ctxRef.current;
    if (!c) return;
    setPizzaSliceSheet(buildPizzaSliceSheet({ ...c, sliceCounts: counts }));
  };

  // 피자 그룹 메뉴 (조각수 설정 모달용)
  const pizzaMenusForModal = useMemo(() => {
    if (!labelContext) return [];
    return labelContext.menus.filter(
      m => resolveNutritionGroup(m, labelContext.masterByCode) === '피자'
    );
  }, [labelContext]);

  useEffect(() => {
    setSliceCounts(loadSliceCounts());
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      await initDB();
      const [
        menuRefs,
        rawMap,
        edgeList,
        toppingList,
        setComps,
        masters,
        ings,
        groups,
        costEdges,
        recipeArrays,
      ] = await Promise.all([
        getAllMenuRefs(),
        getRawValueMap(),
        getAllEdges(),
        getAllToppings(),
        getAllSetCompositions(),
        getAllMenuMaster(),
        getAllIngredients(),
        getAllRecipeGroups(),
        getCostEdges(),
        loadMenuRecipeArrays(),
      ]);

      const masterByCode = Object.fromEntries(masters.map(m => [m.menuCode, m]));
      const edgeMap = Object.fromEntries(edgeList.map(e => [e.edgeCode, e]));

      // 알레르기 집계 — 메뉴 기본 알레르기와 엣지별 알레르기를 분리해 행별로 합산
      const detailRecipes = tagDetailRecipes(
        asObjectArray(recipeArrays.pizza),
        asObjectArray(recipeArrays.personal),
        asObjectArray(recipeArrays.side),
        asObjectArray(recipeArrays.set)
      );
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        groups,
        edges: [],
        compositions: [],
      });
      const menuAllergenMap = buildMenuAllergenMap({ ingredients: ings, ingredientToMenus });
      const edgeAllergenMap = buildEdgeAllergenMap({ ingredients: ings, edges: costEdges });
      const toppingAllergenMap = buildToppingAllergenMap({
        ingredients: ings,
        toppings: toppingList,
      });

      // 출력 메뉴 전처리: 제외 필터 → 메뉴명 오버라이드 → 피자/사이드 우선 가나다 정렬
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(masters);
      const labelNameOverrides = menuNameOverrides;
      const originNameOverrides = loadMenuNames();
      const menuOrder = labelMenuOrder;
      const ingredientNameOverrides = loadIngredientNames();
      const { ingredientToMenus: originIngredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        groups,
        edges: costEdges,
        compositions: [],
      });
      const origins = buildOriginsFromIngredients(
        asObjectArray(ings),
        originIngredientToMenus,
        excludedMenuCodes,
        excludedMenuNames,
        originNameOverrides,
        masterByCode
      );
      const baseMenus = sortNutritionLabelMenus(menuRefs, masterByCode, menuOrder);

      const orderedOriginalMenus = sortNutritionLabelMenus(baseMenus, masterByCode, menuOrder);
      const orderedMenus = orderedOriginalMenus.map(menu => {
        const menuCode = asDisplayText(menu.menuCode);
        const originalMenuName = asDisplayText(menu.originalMenuName ?? menu.menuName);
        return {
          ...menu,
          originalMenuName,
          menuName: applyMenuName(menuCode, originalMenuName, labelNameOverrides),
        };
      });

      const ctx = {
        menus: orderedMenus,
        rawMap,
        edgeMap,
        masterByCode,
        menuAllergenMap,
        edgeAllergenMap,
        toppingAllergenMap,
        toppings: asObjectArray(toppingList),
        setComps,
        menuOrder,
      };
      if (!alive) return;
      ctxRef.current = ctx;
      setLabelContext(ctx);
      setMenuNameEditMenus(
        orderedOriginalMenus
          .map((menu, index) => ({
            menuCode: asDisplayText(menu.menuCode),
            menuName: asDisplayText(menu.originalMenuName ?? menu.menuName, `메뉴 ${index + 1}`),
          }))
          .filter(menu => menu.menuCode)
      );
      setPizzaSheet(buildPizzaSheet(ctx));
      setToppingSheet(buildToppingSheet(ctx));
      setSideSheet(buildSideSheet(ctx));
      setSetHalfSheet(buildSetHalfSheet(ctx));
      setBeverageSheet(buildBeverageSheet(ctx));
      setPizzaSliceSheet(buildPizzaSliceSheet({ ...ctx, sliceCounts: loadSliceCounts() }));
      setOriginStatementSheet(buildOriginStatementSheet(origins, ingredientNameOverrides));
    })()
      .catch(err => {
        if (alive) console.error('[NutritionLabelResult] load failed', err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [menuNameOverrides, labelMenuOrder]);

  async function handleExcel() {
    setExporting(true);
    try {
      await exportNutritionLabelToExcel({
        pizzaSheet,
        pizzaSliceSheet,
        toppingSheet,
        sideSheet,
        setHalfSheet,
        beverageSheet,
      });
      showToast('엑셀 다운로드 완료', 'ok');
    } catch (e) {
      showToast('엑셀 출력 실패: ' + (e?.message || '알 수 없는 오류'), 'error');
    } finally {
      setExporting(false);
    }
  }

  function handlePdf() {
    printNutritionLabelAll({
      pizzaSheet,
      pizzaSliceSheet,
      toppingSheet,
      sideSheet,
      setHalfSheet,
      beverageSheet,
      originStatementSheet,
    });
  }

  function applySliceCounts(next) {
    setSliceCounts(next);
    saveSliceCounts(next);
    rebuildSliceSheet(next);
  }

  function applyMenuNameOverrides(next) {
    saveLabelMenuNames(next);
    setMenuNameOverrides(next);
  }

  function applyMenuOrder(next) {
    saveOrder(LABEL_MENU_ORDER_KEY, next);
    setLabelMenuOrder(next);
  }

  if (loading) return <NutritionLabelLoading />;

  return (
    <div className="origin-result-wrap">
      <NutritionLabelTabs tab={tab} onTabChange={setTab} />
      <NutritionLabelActions
        exporting={exporting}
        onPdf={handlePdf}
        onExcel={handleExcel}
        onEditMenuNames={() => setMenuNameEditOpen(true)}
      />

      {tab === 'pizza' && (
        <PizzaViewControls
          pizzaView={pizzaView}
          onPizzaViewChange={setPizzaView}
          onOpenSliceConfig={() => setSliceModalOpen(true)}
        />
      )}

      <div id="origin-print-area">
        <NutritionLabelTabContent
          tab={tab}
          pizzaView={pizzaView}
          pizzaSheet={pizzaSheet}
          pizzaSliceSheet={pizzaSliceSheet}
          toppingSheet={toppingSheet}
          sideSheet={sideSheet}
          setHalfSheet={setHalfSheet}
          beverageSheet={beverageSheet}
          originStatementSheet={originStatementSheet}
        />
      </div>

      {sliceModalOpen && (
        <SliceConfigModal
          pizzaMenus={pizzaMenusForModal}
          masterByCode={ctxRef.current?.masterByCode || {}}
          counts={sliceCounts}
          onApply={applySliceCounts}
          onClose={() => setSliceModalOpen(false)}
        />
      )}
      {menuNameEditOpen && (
        <MenuNameEditModal
          menus={menuNameEditMenus}
          overrides={menuNameOverrides}
          onApply={applyMenuNameOverrides}
          order={labelMenuOrder}
          onApplyOrder={applyMenuOrder}
          allowOrder
          title="영양성분표 출력명·순서 편집"
          subtitle="영양성분표 출력에만 반영됩니다. 원산지·알레르기 출력명과는 별도로 저장됩니다."
          importActionLabel="원산지 출력명 가져오기"
          onImportOverrides={() => loadMenuNames()}
          onClose={() => setMenuNameEditOpen(false)}
        />
      )}
    </div>
  );
}
