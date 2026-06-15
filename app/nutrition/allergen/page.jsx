'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { downloadCsv } from '@/lib/download';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllToppings, getAllCompositions } from '@/lib/nutrition/values/store';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { ReorderModal } from '@/components/ui/ReorderModal';
import {
  ALLERGEN_MENU_ORDER_KEY,
  ALLERGEN_ORDER_KEY,
  loadOrder,
  saveOrder,
} from '@/lib/nutrition/order';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuNames, saveMenuNames } from '@/lib/nutrition/menu-name-override';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { normStr, buildMenuMatrix, buildDetailRows } from '@/lib/nutrition/allergen/matrix';
import { migrateNutritionToIngredients } from '@/lib/nutrition/migrate-to-ingredient';
import { AllergenDetailModal } from './AllergenDetailModal';
import { AllergenPageHeader } from './AllergenPageHeader';
import { AllergenSummaryPanel } from './AllergenSummaryPanel';
import { AllergenTablePanel } from './AllergenTablePanel';
import { AllergenToolbar } from './AllergenToolbar';

/**
 * 알레르기 정보 페이지 — 자동 집계 뷰
 *
 * 식자재 관리(cost_ingredients)의 allergens 필드 + 레시피 매핑으로
 * 메뉴별 알레르기를 자동 집계. 수동 메뉴 연결 불필요.
 *
 * 두 가지 뷰:
 *   - 식자재별: 각 식자재의 알레르기 항목 + 매칭된 메뉴 수
 *   - 메뉴별 매트릭스: 메뉴 × 22종 알레르기 체크 (출력용)
 */
export default function Page() {
  const [ingredients, setIngredients] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [mapData, setMapData] = useState({
    ingredientToMenus: new Map(),
    menuToIngredients: new Map(),
  });
  const [baseMapData, setBaseMapData] = useState({
    ingredientToMenus: new Map(),
    menuToIngredients: new Map(),
  });
  const [edges, setEdges] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('ingredient'); // 'ingredient' | 'menu'
  const [menuOrder, setMenuOrder] = useState([]);
  const [allergenOrder, setAllergenOrder] = useState([]);
  const [reorderTarget, setReorderTarget] = useState(null); // 'menu' | 'allergen' | null
  const [menuNameEditOpen, setMenuNameEditOpen] = useState(false);
  const [menuNameOverrides, setMenuNameOverrides] = useState(() => loadMenuNames());
  const [detailRow, setDetailRow] = useState(null);
  const mountedRef = useMounted();

  useEffect(() => {
    setMenuOrder(loadOrder(ALLERGEN_MENU_ORDER_KEY));
    setAllergenOrder(loadOrder(ALLERGEN_ORDER_KEY));
  }, []);

  const load = useCallback(async () => {
    await initDB();
    await migrateNutritionToIngredients().catch(e =>
      console.warn('[nutrition/allergen] 마이그레이션 실패', e)
    );
    const [ings, masters, groups, edges, toppingList, recipeArrays, compositions] =
      await Promise.all([
        getAllIngredients(),
        getAllMenuMaster(),
        getAllRecipeGroups(),
        getAllEdges(),
        getAllToppings(),
        loadMenuRecipeArrays(),
        getAllCompositions(),
      ]);
    if (!mountedRef.current) return;
    const safeIngredients = asObjectArray(ings);
    const safeMenuMasters = asObjectArray(masters);
    const safeGroups = asObjectArray(groups);
    const safeEdges = asObjectArray(edges);
    const detailRecipes = tagDetailRecipes(
      asObjectArray(recipeArrays.pizza),
      asObjectArray(recipeArrays.personal),
      asObjectArray(recipeArrays.side),
      asObjectArray(recipeArrays.set)
    );
    setIngredients(safeIngredients);
    setMenuMasters(safeMenuMasters);
    setEdges(safeEdges);
    setToppings(asObjectArray(toppingList));
    setMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        groups: safeGroups,
        edges: safeEdges,
        compositions: asObjectArray(compositions),
      })
    );
    // 엣지 제외 base 맵 — 크러스트 변형별 알레르겐 분리용 (석쇠 = 엣지 없는 기본)
    setBaseMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        groups: safeGroups,
        edges: [],
        compositions: asObjectArray(compositions),
      })
    );
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) {
          console.error(err);
          showToast('데이터 로드 실패: ' + err.message, 'error');
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);
  useVisibilityRefresh(load);

  // 알레르기 있는 식자재
  const allergenIngredients = useMemo(
    () =>
      asObjectArray(ingredients).filter(
        i => asStringArray(i.allergens).length && !i.discontinued && !i.excluded
      ),
    [ingredients]
  );

  // 원산지·알레르기 출력에서 제외된 메뉴 — menuCode + menuName 양쪽 매칭
  const { excludedMenuCodes, excludedMenuNames } = useMemo(
    () => extractExcludedMenuSets(menuMasters),
    [menuMasters]
  );
  const isExcludedMenu = useCallback(
    (menuCode, menuName) =>
      excludedMenuCodes.has(menuCode) ||
      excludedMenuCodes.has(asDisplayText(menuCode)) ||
      excludedMenuNames.has(asDisplayText(menuName).trim()),
    [excludedMenuCodes, excludedMenuNames]
  );

  // ── 식자재 기준 뷰 ─────────────────────────────────────────
  const ingredientRows = useMemo(() => {
    const q = asDisplayText(search).toLowerCase().trim();
    return allergenIngredients.filter(ing => {
      if (!q) return true;
      const ingredientAllergens = asStringArray(ing.allergens);
      const allergenNames = ALLERGEN_SEED.filter(a => ingredientAllergens.includes(a.allergenCode))
        .map(a => asDisplayText(a.allergenName))
        .join(' ');
      return (
        asDisplayText(ing.ingredientName).toLowerCase().includes(q) ||
        asDisplayText(ing.productCode).toLowerCase().includes(q) ||
        allergenNames.toLowerCase().includes(q)
      );
    });
  }, [allergenIngredients, search]);

  // ── 메뉴별 매트릭스 뷰 (피자는 크러스트/엣지 변형별 행) ──────
  const menuMatrixAll = useMemo(
    () =>
      buildMenuMatrix(
        allergenIngredients,
        baseMapData,
        edges,
        isExcludedMenu,
        menuOrder,
        menuNameOverrides,
        toppings
      ),
    [
      allergenIngredients,
      baseMapData,
      edges,
      isExcludedMenu,
      menuOrder,
      menuNameOverrides,
      toppings,
    ]
  );

  // 알레르기 22종 표시 순서 — 저장된 순서 우선, 없으면 빈도 내림차순
  const orderedAllergens = useMemo(() => {
    const safeOrder = asStringArray(allergenOrder);
    if (safeOrder.length) {
      const rank = new Map(safeOrder.map((c, i) => [c, i]));
      return [...ALLERGEN_SEED].sort((a, b) => {
        const ra = rank.has(asDisplayText(a.allergenCode))
          ? rank.get(asDisplayText(a.allergenCode))
          : Infinity;
        const rb = rank.has(asDisplayText(b.allergenCode))
          ? rank.get(asDisplayText(b.allergenCode))
          : Infinity;
        if (ra !== rb) return ra - rb;
        return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
      });
    }
    const freq = new Map();
    for (const row of menuMatrixAll) {
      const codes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
      for (const code of codes) freq.set(code, (freq.get(code) ?? 0) + 1);
    }
    return [...ALLERGEN_SEED].sort((a, b) => {
      const fa = freq.get(asDisplayText(a.allergenCode)) ?? 0;
      const fb = freq.get(asDisplayText(b.allergenCode)) ?? 0;
      if (fb !== fa) return fb - fa;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }, [allergenOrder, menuMatrixAll]);

  const ingredientByKey = useMemo(() => {
    const map = new Map();
    for (const ing of allergenIngredients) {
      const productCode = asDisplayText(ing.productCode);
      if (productCode) map.set(`code:${productCode}`, ing);
      const nameKey = normStr(ing.ingredientName);
      if (nameKey) map.set(`name:${nameKey}`, ing);
    }
    return map;
  }, [allergenIngredients]);

  const detailRows = useMemo(
    () => buildDetailRows(detailRow, baseMapData, edges, ingredientByKey),
    [baseMapData, detailRow, edges, ingredientByKey]
  );

  const menuMatrix = useMemo(() => {
    const q = asDisplayText(search).toLowerCase().trim();
    if (!q) return menuMatrixAll;
    return menuMatrixAll.filter(r => {
      const allergenCodes = r.allergenCodes instanceof Set ? r.allergenCodes : new Set();
      return (
        asDisplayText(r.menuName).toLowerCase().includes(q) ||
        asDisplayText(r.crust).toLowerCase().includes(q) ||
        ALLERGEN_SEED.filter(a => allergenCodes.has(a.allergenCode)).some(a =>
          asDisplayText(a.allergenName).toLowerCase().includes(q)
        )
      );
    });
  }, [menuMatrixAll, search]);

  // 순서 변경 모달용 — 메뉴 1개씩(변형 제외, menuCode 중복 제거)
  const menuListForOrder = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of menuMatrixAll) {
      const menuCode = asDisplayText(r.menuCode);
      if (!menuCode || seen.has(menuCode)) continue;
      seen.add(menuCode);
      out.push({ key: menuCode, label: asDisplayText(r.originalMenuName ?? r.menuName) });
    }
    return out;
  }, [menuMatrixAll]);

  const totalWithAllergen = allergenIngredients.length;
  const totalIngredients = asObjectArray(ingredients).filter(
    i => !i.discontinued && !i.excluded
  ).length;

  const handleExportCsv = useCallback(() => {
    const headers = [
      '메뉴명',
      '크러스트',
      ...orderedAllergens.map(a => asDisplayText(a.allergenName)),
    ];
    const rows = menuMatrix.map(r => {
      const allergenCodes = r.allergenCodes instanceof Set ? r.allergenCodes : new Set();
      return [
        asDisplayText(r.menuName),
        asDisplayText(r.crust),
        ...orderedAllergens.map(a => (allergenCodes.has(asDisplayText(a.allergenCode)) ? '●' : '')),
      ];
    });
    downloadCsv([headers, ...rows], '알레르기매트릭스.csv');
  }, [menuMatrix, orderedAllergens]);

  const handleResetOrder = useCallback(() => {
    saveOrder(ALLERGEN_MENU_ORDER_KEY, []);
    saveOrder(ALLERGEN_ORDER_KEY, []);
    setMenuOrder([]);
    setAllergenOrder([]);
  }, []);

  return (
    <main className="main">
      <AllergenPageHeader exportDisabled={menuMatrix.length === 0} onExport={handleExportCsv} />
      <AllergenSummaryPanel
        totalWithAllergen={totalWithAllergen}
        totalIngredients={totalIngredients}
        matchedMenuCount={menuMatrix.length}
      />
      <AllergenToolbar
        search={search}
        viewMode={viewMode}
        hasCustomOrder={menuOrder.length > 0 || allergenOrder.length > 0}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        onEditMenuNames={() => setMenuNameEditOpen(true)}
        onReorderMenu={() => setReorderTarget('menu')}
        onReorderAllergen={() => setReorderTarget('allergen')}
        onResetOrder={handleResetOrder}
      />
      <AllergenTablePanel
        loading={loading}
        viewMode={viewMode}
        ingredientRows={ingredientRows}
        mapData={mapData}
        isExcludedMenu={isExcludedMenu}
        menuMatrix={menuMatrix}
        orderedAllergens={orderedAllergens}
        onDetailRow={setDetailRow}
      />

      {reorderTarget === 'menu' && (
        <ReorderModal
          title="메뉴 순서 (석쇠·엣지 변형 함께 이동)"
          items={menuListForOrder}
          onApply={keys => {
            saveOrder(ALLERGEN_MENU_ORDER_KEY, keys);
            setMenuOrder(keys);
          }}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {reorderTarget === 'allergen' && (
        <ReorderModal
          title="알레르기 22종 순서"
          items={orderedAllergens
            .map(a => ({
              key: asDisplayText(a.allergenCode),
              label: asDisplayText(a.allergenName),
            }))
            .filter(item => item.key)}
          onApply={keys => {
            saveOrder(ALLERGEN_ORDER_KEY, keys);
            setAllergenOrder(keys);
          }}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {menuNameEditOpen && (
        <MenuNameEditModal
          menus={menuListForOrder
            .map(m => ({ menuCode: asDisplayText(m.key), menuName: asDisplayText(m.label) }))
            .filter(menu => menu.menuCode)}
          overrides={menuNameOverrides}
          onApply={next => {
            saveMenuNames(next);
            setMenuNameOverrides(next);
          }}
          onClose={() => setMenuNameEditOpen(false)}
        />
      )}
      <AllergenDetailModal
        detailRow={detailRow}
        detailRows={detailRows}
        onClose={() => setDetailRow(null)}
      />
    </main>
  );
}
