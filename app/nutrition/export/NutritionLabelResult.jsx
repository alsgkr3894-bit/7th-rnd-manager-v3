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
  getAllCompositions,
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
import { loadMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { loadIngredientNames } from '@/lib/nutrition/ingredient-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { MENU_ORDER_KEY, loadOrder } from '@/lib/nutrition/order';
import { loadSliceCounts, saveSliceCounts } from '@/lib/nutrition/slice-config';
import { buildOriginsFromIngredients } from '@/lib/nutrition/origin/build';
import { buildOriginStatementSheet } from '@/lib/nutrition/origin/output-sheets';
import { SliceConfigModal } from '@/components/nutrition/SliceConfigModal';
import { asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildPizzaSheet,
  buildPizzaSliceSheet,
  buildToppingSheet,
  buildSideSheet,
  buildSetHalfSheet,
  buildBeverageSheet,
  sortNutritionLabelMenus,
  augmentWithDerived,
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
        compositions,
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
        getAllCompositions(),
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
        compositions,
      });
      const menuAllergenMap = buildMenuAllergenMap({ ingredients: ings, ingredientToMenus });
      const edgeAllergenMap = buildEdgeAllergenMap({ ingredients: ings, edges: costEdges });
      const toppingAllergenMap = buildToppingAllergenMap({
        ingredients: ings,
        toppings: toppingList,
      });

      // 출력 메뉴 전처리: 제외 필터 → 메뉴명 오버라이드 → 피자/사이드 우선 가나다 정렬
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(masters);
      const nameOverrides = loadMenuNames();
      const menuOrder = loadOrder(MENU_ORDER_KEY);
      const ingredientNameOverrides = loadIngredientNames();
      const { ingredientToMenus: originIngredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        groups,
        edges: costEdges,
        compositions,
      });
      const origins = buildOriginsFromIngredients(
        asObjectArray(ings),
        originIngredientToMenus,
        excludedMenuCodes,
        excludedMenuNames,
        nameOverrides,
        masterByCode
      );
      const baseMenus = sortNutritionLabelMenus(
        menuRefs
          .filter(
            m =>
              !excludedMenuCodes.has(m.menuCode) &&
              !excludedMenuNames.has((m.menuName || '').trim())
          )
          .map(m => ({ ...m, menuName: applyMenuName(m.menuCode, m.menuName, nameOverrides) })),
        masterByCode,
        menuOrder
      );

      // 파생 메뉴 병합 후 재정렬 (파생 menuRef의 category=베이스 복사로 동일 그룹 정렬)
      const { menus: augmentedMenus, rawMap: augmentedRawMap } = augmentWithDerived({
        menus: baseMenus,
        rawMap,
        compositions,
        masterByCode,
      });
      const orderedMenus = sortNutritionLabelMenus(augmentedMenus, masterByCode, menuOrder);

      const ctx = {
        menus: orderedMenus,
        rawMap: augmentedRawMap,
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
  }, []);

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

  if (loading) return <NutritionLabelLoading />;

  return (
    <div className="origin-result-wrap">
      <NutritionLabelTabs tab={tab} onTabChange={setTab} />
      <NutritionLabelActions exporting={exporting} onPdf={handlePdf} onExcel={handleExcel} />

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
    </div>
  );
}
