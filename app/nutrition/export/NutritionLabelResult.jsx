'use client';
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState, useMemo, useRef } from 'react';
import { initDB } from '@/lib/db';
import { getAllSetCompositions } from '@/lib/nutrition/values/store';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { buildNutritionLabelContext } from '@/lib/nutrition/label/context';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import {
  loadLabelMenuNames,
  saveLabelMenuNames,
  loadMenuNames,
  applyMenuName,
} from '@/lib/nutrition/menu-name-override';
import { loadIngredientNames } from '@/lib/nutrition/ingredient-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import {
  LABEL_MENU_ORDER_KEY,
  LABEL_SIDE_ORDER_KEY,
  LABEL_TOPPING_ORDER_KEY,
  LABEL_SET_ORDER_KEY,
  LABEL_BEVERAGE_ORDER_KEY,
  loadOrder,
  saveOrder,
} from '@/lib/nutrition/order';
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
  NUTRITION_LABEL_ORDER_CATEGORY_NAMES,
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
  const [menuNameEditCategory, setMenuNameEditCategory] = useState(null);
  const [menuNameOverrides, setMenuNameOverrides] = useState(() => loadLabelMenuNames());
  // 카테고리별 출력 순서 — 피자/사이드·파스타/추가토핑/세트박스·하프앤하프/음료를 각각 독립적으로 저장한다.
  const [pizzaOrder, setPizzaOrder] = useState(() => loadOrder(LABEL_MENU_ORDER_KEY));
  const [sideOrder, setSideOrder] = useState(() => loadOrder(LABEL_SIDE_ORDER_KEY));
  const [toppingOrder, setToppingOrder] = useState(() => loadOrder(LABEL_TOPPING_ORDER_KEY));
  const [setBoxOrder, setSetBoxOrder] = useState(() => loadOrder(LABEL_SET_ORDER_KEY));
  const [beverageOrder, setBeverageOrder] = useState(() => loadOrder(LABEL_BEVERAGE_ORDER_KEY));
  const [categoryEditMenus, setCategoryEditMenus] = useState({
    pizza: [],
    side: [],
    topping: [],
    set: [],
    drink: [],
  });
  const [labelContext, setLabelContext] = useState(null);
  const ctxRef = useRef(null); // { menus, rawMap, edgeMap, masterByCode, menuAllergenMap, edgeAllergenMap }

  const CATEGORY_ORDER_STATE = {
    pizza: { order: pizzaOrder, setOrder: setPizzaOrder, key: LABEL_MENU_ORDER_KEY },
    side: { order: sideOrder, setOrder: setSideOrder, key: LABEL_SIDE_ORDER_KEY },
    topping: { order: toppingOrder, setOrder: setToppingOrder, key: LABEL_TOPPING_ORDER_KEY },
    set: { order: setBoxOrder, setOrder: setSetBoxOrder, key: LABEL_SET_ORDER_KEY },
    drink: { order: beverageOrder, setOrder: setBeverageOrder, key: LABEL_BEVERAGE_ORDER_KEY },
  };

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
      const [setComps, labelCtx] = await Promise.all([
        getAllSetCompositions(),
        buildNutritionLabelContext(),
      ]);
      const {
        menuRefs,
        rawMap,
        edgeMap,
        masterByCode,
        menuAllergenMap,
        edgeAllergenMap,
        toppingAllergenMap,
        toppings: toppingList,
        masters,
        ings,
        groups,
        costEdges,
        detailRecipes,
      } = labelCtx;

      // 출력 메뉴 전처리: 제외 필터 → 메뉴명 오버라이드 → 피자/사이드 우선 가나다 정렬
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(masters);
      const labelNameOverrides = menuNameOverrides;
      const originNameOverrides = loadMenuNames();
      // nutrition_menu_ref 기반 카테고리(피자/사이드·파스타/음료)는 하나의 목록을 함께 정렬하므로
      // 각 카테고리 순서를 이어붙여도(orderRank가 그룹 순위보다 우선하지만, 그룹 순서대로 이어붙였으므로
      // 결과적으로 그룹 순서와 충돌하지 않는다) 카테고리별 순서가 그대로 반영된다.
      const menuOrder = [...pizzaOrder, ...sideOrder, ...beverageOrder];
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
        toppingOrder,
        setComps,
        setOrder: setBoxOrder,
        nameOverrides: labelNameOverrides,
        menuOrder,
      };
      if (!alive) return;
      ctxRef.current = ctx;
      setLabelContext(ctx);

      // 카테고리별 "출력명·순서" 편집 목록 — 각 탭에서 그 카테고리 항목만 보이게 분리한다.
      const toEditItem = (code, name, index) => ({
        menuCode: asDisplayText(code),
        menuName: asDisplayText(name, `항목 ${index + 1}`),
      });
      const byGroup = group =>
        orderedOriginalMenus.filter(m => resolveNutritionGroup(m, masterByCode) === group);
      const pizzaEditMenus = byGroup('피자')
        .map((m, i) => toEditItem(m.menuCode, m.originalMenuName ?? m.menuName, i))
        .filter(m => m.menuCode);
      const sideEditMenus = byGroup('사이드')
        .map((m, i) => toEditItem(m.menuCode, m.originalMenuName ?? m.menuName, i))
        .filter(m => m.menuCode);
      const beverageEditMenus = byGroup('음료')
        .map((m, i) => toEditItem(m.menuCode, m.originalMenuName ?? m.menuName, i))
        .filter(m => m.menuCode);
      const toppingEditMenus = asObjectArray(toppingList)
        .map((t, i) => toEditItem(t.toppingCode, t.toppingName, i))
        .filter(m => m.menuCode);
      const setNames = [
        ...new Set(
          asObjectArray(setComps)
            .filter(c => c.kind === 'set')
            .map(c => asDisplayText(c.setName))
            .filter(Boolean)
        ),
      ];
      const setEditMenus = setNames.map((name, i) => toEditItem(name, name, i));
      setCategoryEditMenus({
        pizza: pizzaEditMenus,
        side: sideEditMenus,
        topping: toppingEditMenus,
        set: setEditMenus,
        drink: beverageEditMenus,
      });

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
  }, [menuNameOverrides, pizzaOrder, sideOrder, toppingOrder, setBoxOrder, beverageOrder]);

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

  function applyCategoryOrder(category, next) {
    const entry = CATEGORY_ORDER_STATE[category];
    if (!entry) return;
    saveOrder(entry.key, next);
    entry.setOrder(next);
  }

  if (loading) return <NutritionLabelLoading />;

  return (
    <div className="origin-result-wrap">
      <NutritionLabelTabs tab={tab} onTabChange={setTab} />
      <NutritionLabelActions
        exporting={exporting}
        onPdf={handlePdf}
        onExcel={handleExcel}
        tab={tab}
        onEditMenuNames={category => {
          setMenuNameEditCategory(category);
          setMenuNameEditOpen(true);
        }}
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
      {menuNameEditOpen && menuNameEditCategory && (
        <MenuNameEditModal
          menus={categoryEditMenus[menuNameEditCategory] || []}
          overrides={menuNameOverrides}
          onApply={applyMenuNameOverrides}
          order={CATEGORY_ORDER_STATE[menuNameEditCategory]?.order || []}
          onApplyOrder={next => applyCategoryOrder(menuNameEditCategory, next)}
          allowOrder
          title={`${NUTRITION_LABEL_ORDER_CATEGORY_NAMES[menuNameEditCategory]} 출력명·순서 편집`}
          subtitle="영양성분표 출력에만 반영됩니다. 카테고리별로 별도 저장되며, 원산지·알레르기 출력명과도 별도입니다."
          importActionLabel="원산지 출력명 가져오기"
          onImportOverrides={() => loadMenuNames()}
          onClose={() => setMenuNameEditOpen(false)}
        />
      )}
    </div>
  );
}
