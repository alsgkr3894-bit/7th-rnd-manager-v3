'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { buildIngredientMenuMap, getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import { ReorderModal } from '@/components/ui/ReorderModal';
import { MENU_ORDER_KEY, loadOrder, saveOrder } from '@/lib/nutrition/order';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuNames, saveMenuNames } from '@/lib/nutrition/menu-name-override';
import { buildOriginIngredientRows, buildOriginMenuRows } from '@/lib/nutrition/origin/build';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { OriginSummaryPanel } from './OriginSummaryPanel';
import { OriginToolbar } from './OriginToolbar';
import { OriginTablePanel } from './OriginTablePanel';

const EMPTY_MENU_MAP = new Map();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);
const VISIBILITY_REFRESH_MIN_MS = 60 * 1000;

/**
 * 원산지 정보 페이지 — 자동 집계 뷰
 *
 * 식자재 관리(cost_ingredients)의 origin 필드 + 레시피 매핑으로
 * 메뉴별 원산지를 자동 표시. 수동 메뉴 연결 불필요.
 */
export default function Page() {
  const [ingredients, setIngredients] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [mapData, setMapData] = useState({
    ingredientToMenus: new Map(),
    menuToIngredients: new Map(),
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('ingredient'); // 'ingredient' | 'menu'
  const [menuOrder, setMenuOrder] = useState([]);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [menuNameEditOpen, setMenuNameEditOpen] = useState(false);
  const [menuNameOverrides, setMenuNameOverrides] = useState(() => loadMenuNames());
  const mountedRef = useMounted();
  const lastLoadedAtRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    setMenuOrder(loadOrder(MENU_ORDER_KEY));
  }, []);

  const load = useCallback(
    async ({ skipIfFresh = false } = {}) => {
      if (loadingRef.current) return;
      const now = Date.now();
      if (skipIfFresh && now - lastLoadedAtRef.current < VISIBILITY_REFRESH_MIN_MS) return;

      loadingRef.current = true;
      try {
        await initDB();
        const [ings, masters, groups, edges, recipeArrays] = await Promise.all([
          getAllIngredients(),
          getAllMenuMaster(),
          getAllRecipeGroups(),
          getAllEdges(),
          loadMenuRecipeArrays(),
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
        setMapData(
          buildIngredientMenuMap({
            menuMasters: safeMenuMasters,
            detailRecipes,
            groups: safeGroups,
            edges: safeEdges,
          })
        );
        lastLoadedAtRef.current = Date.now();
      } finally {
        loadingRef.current = false;
      }
    },
    [mountedRef]
  );

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) console.error('[NutritionOrigin] load failed', err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);
  useVisibilityRefresh(() => load({ skipIfFresh: true }));

  // 원산지 있는 식자재만 (미표시대상은 토글에 따라 포함/제외)
  const originIngredients = useMemo(
    () =>
      asObjectArray(ingredients).filter(
        i =>
          asObjectArray(i.origin).length &&
          !i.discontinued &&
          !i.excluded &&
          (showHidden || !i.originHidden)
      ),
    [ingredients, showHidden]
  );

  // 미표시대상(originHidden) 식자재 개수 — 토글 안내용
  const hiddenCount = useMemo(
    () =>
      asObjectArray(ingredients).filter(
        i => asObjectArray(i.origin).length && !i.discontinued && !i.excluded && i.originHidden
      ).length,
    [ingredients]
  );

  // 원산지 출력에서 제외된 메뉴 — menuCode + menuName 양쪽으로 매칭
  // (레시피 코드와 메뉴마스터 코드가 다르거나 L/R 사이즈별 레코드인 경우 대비)
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
  const ingredientRows = useMemo(
    () => buildOriginIngredientRows(originIngredients, mapData, isExcludedMenu, search),
    [originIngredients, search, mapData, isExcludedMenu]
  );

  // ── 메뉴 기준 뷰 ───────────────────────────────────────────
  const menuRowsAll = useMemo(
    () =>
      buildOriginMenuRows(originIngredients, mapData, isExcludedMenu, menuOrder, menuNameOverrides),
    [originIngredients, mapData, isExcludedMenu, menuOrder, menuNameOverrides]
  );

  const menuRows = useMemo(() => {
    const q = asDisplayText(search).toLowerCase().trim();
    if (!q) return menuRowsAll;
    return menuRowsAll.filter(
      r =>
        asDisplayText(r.menuName).toLowerCase().includes(q) ||
        asObjectArray(r.origins).some(
          o =>
            asDisplayText(o.displayName).toLowerCase().includes(q) ||
            asDisplayText(o.country).toLowerCase().includes(q)
        )
    );
  }, [menuRowsAll, search]);

  // showHidden 여부와 무관하게 실제 원산지 등록 항목 수 계산 (미표시대상도 포함)
  const totalWithOrigin = asObjectArray(ingredients).filter(
    i => asObjectArray(i.origin).length && !i.discontinued && !i.excluded
  ).length;
  const totalIngredients = asObjectArray(ingredients).filter(
    i => !i.discontinued && !i.excluded
  ).length;

  const withoutOrigin = totalIngredients - totalWithOrigin;

  function exportCsv() {
    const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
    if (viewMode === 'ingredient') {
      const headers = [
        '식자재명',
        '표시품목명',
        '원산지',
        '제때 코드',
        '매칭 메뉴 수',
        '매칭 메뉴',
      ];
      const rows = ingredientRows.map(ing => {
        const ingredientName = asDisplayText(ing.ingredientName);
        const origins = asObjectArray(ing.origin);
        const allMenus = getMenusForIngredient(
          ingredientToMenus,
          asDisplayText(ing.productCode),
          ingredientName
        );
        const menus = [...allMenus]
          .filter(([mc, m]) => !isExcludedMenu(mc, m?.menuName))
          .map(([, m]) => asDisplayText(m?.menuName));
        return [
          ingredientName,
          origins.map(it => asDisplayText(it.displayName) || ingredientName).join(' / '),
          origins.map(it => asDisplayText(it.country)).join(' / '),
          asDisplayText(ing.productCode),
          menus.length,
          menus.join(', '),
        ];
      });
      downloadCsv([headers, ...rows], makeFileNameWithBrand('원산지_식자재별', 'csv'));
      return;
    }
    const headers = ['메뉴명', '카테고리', '표시품목', '원산지'];
    const rows = menuRows.flatMap(row =>
      asObjectArray(row.origins).map(o => [
        asDisplayText(row.menuName),
        asDisplayText(row.category),
        asDisplayText(o.displayName),
        asDisplayText(o.country),
      ])
    );
    downloadCsv([headers, ...rows], makeFileNameWithBrand('원산지_메뉴별', 'csv'));
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '원산지 정보']}
        title="원산지 정보"
        masterSource
        sub="식자재 관리에서 식자재별 원산지를 입력하면 자동으로 매칭됩니다"
      />

      <OriginSummaryPanel
        totalWithOrigin={totalWithOrigin}
        totalIngredients={totalIngredients}
        withoutOrigin={withoutOrigin}
        menuCount={menuRows.length}
      />

      <OriginToolbar
        search={search}
        onSearch={setSearch}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onExportCsv={exportCsv}
        exportDisabled={
          viewMode === 'ingredient' ? ingredientRows.length === 0 : menuRows.length === 0
        }
        hiddenCount={hiddenCount}
        showHidden={showHidden}
        onToggleHidden={() => setShowHidden(v => !v)}
        onOpenMenuNameEdit={() => setMenuNameEditOpen(true)}
        onOpenReorder={() => setReorderOpen(true)}
        menuOrderCount={menuOrder.length}
        onResetOrder={() => {
          saveOrder(MENU_ORDER_KEY, []);
          setMenuOrder([]);
        }}
      />

      <OriginTablePanel
        loading={loading}
        viewMode={viewMode}
        ingredientRows={ingredientRows}
        menuRows={menuRows}
        mapData={mapData}
        isExcludedMenu={isExcludedMenu}
      />

      {reorderOpen && (
        <ReorderModal
          title="메뉴 출력 순서"
          items={menuRowsAll
            .map(m => ({ key: asDisplayText(m.menuCode), label: asDisplayText(m.menuName) }))
            .filter(item => item.key)}
          onApply={keys => {
            saveOrder(MENU_ORDER_KEY, keys);
            setMenuOrder(keys);
          }}
          onClose={() => setReorderOpen(false)}
        />
      )}
      {menuNameEditOpen && (
        <MenuNameEditModal
          menus={menuRowsAll
            .map(m => ({
              menuCode: asDisplayText(m.menuCode),
              menuName: asDisplayText(m.originalMenuName ?? m.menuName),
            }))
            .filter(menu => menu.menuCode)}
          overrides={menuNameOverrides}
          onApply={next => {
            saveMenuNames(next);
            setMenuNameOverrides(next);
          }}
          onClose={() => setMenuNameEditOpen(false)}
        />
      )}
    </main>
  );
}
