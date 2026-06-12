'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMounted } from '@/hooks/useMounted';
import Link from 'next/link';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { downloadCsv } from '@/lib/download';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllRecipes } from '@/lib/recipe';
import { getAllToppings, getAllCompositions } from '@/lib/nutrition/values/store';
import { buildIngredientMenuMap, getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';
import { ReorderModal } from '@/components/ui/ReorderModal';
import { ModalFrame } from '@/components/ui/ModalFrame';
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
import {
  asMenuMap,
  normStr,
  buildMenuMatrix,
  buildDetailRows,
} from '@/lib/nutrition/allergen/matrix';

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

  // 알레르기 22종 표시 순서 — 저장된 순서 우선, 없으면 기본 displayOrder
  const orderedAllergens = useMemo(() => {
    const safeOrder = asStringArray(allergenOrder);
    if (!safeOrder.length) return ALLERGEN_SEED;
    const rank = new Map(safeOrder.map((c, i) => [c, i]));
    return [...ALLERGEN_SEED].sort((a, b) => {
      const aCode = asDisplayText(a.allergenCode);
      const bCode = asDisplayText(b.allergenCode);
      const ra = rank.has(aCode) ? rank.get(aCode) : Infinity;
      const rb = rank.has(bCode) ? rank.get(bCode) : Infinity;
      if (ra !== rb) return ra - rb;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }, [allergenOrder]);

  const load = useCallback(async () => {
    await initDB();
    const [
      ings,
      masters,
      groups,
      edges,
      toppingList,
      pizzaRecs,
      personalRecs,
      sideRecs,
      setRecs,
      oldRecs,
      compositions,
    ] = await Promise.all([
      getAllIngredients(),
      getAllMenuMaster(),
      getAllRecipeGroups(),
      getAllEdges(),
      getAllToppings(),
      getAllPizzaRecipes(),
      getAllPersonalRecipes(),
      getAllSideRecipes(),
      getAllSetRecipes(),
      getAllRecipes(),
      getAllCompositions(),
    ]);
    if (!mountedRef.current) return;
    const safeIngredients = asObjectArray(ings);
    const safeMenuMasters = asObjectArray(masters);
    const safeGroups = asObjectArray(groups);
    const safeEdges = asObjectArray(edges);
    const safeOldRecipes = asObjectArray(oldRecs);
    const detailRecipes = tagDetailRecipes(
      asObjectArray(pizzaRecs),
      asObjectArray(personalRecs),
      asObjectArray(sideRecs),
      asObjectArray(setRecs)
    );
    setIngredients(safeIngredients);
    setMenuMasters(safeMenuMasters);
    setEdges(safeEdges);
    setToppings(asObjectArray(toppingList));
    setMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        oldRecipes: safeOldRecipes,
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
        oldRecipes: safeOldRecipes,
        groups: safeGroups,
        edges: [],
        compositions: asObjectArray(compositions),
      })
    );
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) console.error(err);
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
    [allergenIngredients, baseMapData, edges, isExcludedMenu, menuOrder, menuNameOverrides, toppings]
  );

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

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        masterSource
        sub="식자재 관리에서 식자재별 알레르기 항목을 체크하면 자동으로 메뉴에 매칭됩니다"
        actions={
          <button
            className="btn"
            onClick={() => {
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
                  ...orderedAllergens.map(a =>
                    allergenCodes.has(asDisplayText(a.allergenCode)) ? '●' : ''
                  ),
                ];
              });
              downloadCsv([headers, ...rows], '알레르기매트릭스.csv');
            }}
            disabled={menuMatrix.length === 0}
          >
            <Icon.download style={{ width: 14, height: 14 }} /> CSV 내보내기
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="알레르기 등록 식자재" value={totalWithAllergen} />
        <SmallStatCard label="전체 식자재" value={totalIngredients} />
        <SmallStatCard label="알레르기 매칭 메뉴" value={menuMatrix.length} />
      </div>

      {/* 법정 22종 안내 */}
      <div className="card" style={{ marginTop: 16, padding: '12px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
          한국 법정 알레르기 22종
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALLERGEN_SEED.map(al => (
            <span
              key={asDisplayText(al.allergenCode)}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
              }}
            >
              {asDisplayText(al.allergenName)}
            </span>
          ))}
        </div>
      </div>

      {totalWithAllergen === 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon.alert style={{ width: 16, height: 16, flexShrink: 0 }} />
          알레르기 등록 식자재 없음 —{' '}
          <Link href="/ingredient/manage" style={{ color: 'inherit', textDecoration: 'underline' }}>
            식자재 관리에서 입력
          </Link>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="식자재명·메뉴명·알레르기 검색"
        />
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
          {['ingredient', 'menu'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 14px',
                border: 0,
                background: 'transparent',
                fontSize: 13,
                fontWeight: viewMode === mode ? 700 : 500,
                color: viewMode === mode ? 'var(--accent)' : 'var(--text-3)',
                borderBottom:
                  viewMode === mode ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {mode === 'ingredient' ? '식자재별' : '메뉴별 매트릭스'}
            </button>
          ))}
        </div>
        {viewMode === 'menu' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={() => setMenuNameEditOpen(true)}>
              메뉴명 편집
            </button>
            <button className="btn sm" onClick={() => setReorderTarget('menu')}>
              메뉴 순서
            </button>
            <button className="btn sm" onClick={() => setReorderTarget('allergen')}>
              알레르기 순서
            </button>
            {(menuOrder.length > 0 || allergenOrder.length > 0) && (
              <button
                className="btn sm"
                onClick={() => {
                  saveOrder(ALLERGEN_MENU_ORDER_KEY, []);
                  saveOrder(ALLERGEN_ORDER_KEY, []);
                  setMenuOrder([]);
                  setAllergenOrder([]);
                }}
                title="저장된 메뉴·알레르기 순서를 지우고 기본 순서로 복원"
              >
                순서 초기화
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            불러오는 중…
          </div>
        ) : viewMode === 'ingredient' ? (
          ingredientRows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Icon.beaker style={{ width: 28, height: 28 }} />
              </div>
              <div className="empty-title">알레르기 등록 식자재가 없어요</div>
              <div className="empty-sub">
                <Link href="/ingredient/manage">식자재 관리</Link>에서 식자재별 알레르기를
                체크하세요
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>식자재명</th>
                  <th>제때 코드</th>
                  <th>알레르기 항목</th>
                  <th>매칭 메뉴 수</th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map(ing => {
                  const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
                  const productCode = asDisplayText(ing.productCode);
                  const ingredientName = asDisplayText(ing.ingredientName);
                  const ingredientAllergens = asStringArray(ing.allergens);
                  const allMenus = getMenusForIngredient(
                    ingredientToMenus,
                    productCode,
                    ingredientName
                  );
                  const menus = new Map(
                    [...allMenus].filter(([mc, m]) => !isExcludedMenu(mc, m?.menuName))
                  );
                  const allergenNames = ALLERGEN_SEED.filter(a =>
                    ingredientAllergens.includes(a.allergenCode)
                  ).map(a => asDisplayText(a.allergenName));
                  return (
                    <tr key={asDisplayText(ing.id) || productCode || ingredientName}>
                      <td style={{ fontWeight: 600 }}>{ingredientName}</td>
                      <td className="mono muted">{productCode || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allergenNames.map(name => (
                            <span
                              key={name}
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: 'var(--accent)',
                                color: '#fff',
                                fontWeight: 700,
                              }}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {menus.size > 0 ? (
                          <span style={{ fontWeight: 700, color: 'var(--positive)' }}>
                            {menus.size}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-4)' }}>0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : // 메뉴별 매트릭스
        menuMatrix.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <Icon.doc style={{ width: 28, height: 28 }} />
            </div>
            <div className="empty-title">표시할 메뉴가 없어요</div>
            <div className="empty-sub">
              식자재에 알레르기를 등록하고 원가 레시피에 구성품을 추가하면 자동 매칭됩니다
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 400px)', minHeight: 300 }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      minWidth: 160,
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      background: 'var(--surface-2)',
                      zIndex: 4,
                    }}
                  >
                    메뉴명
                  </th>
                  <th
                    style={{
                      width: 80,
                      position: 'sticky',
                      top: 0,
                      background: 'var(--surface-2)',
                      zIndex: 2,
                    }}
                  >
                    카테고리
                  </th>
                  {orderedAllergens.map(al => (
                    <th
                      key={al.allergenCode}
                      style={{
                        width: 46,
                        fontSize: 11,
                        textAlign: 'center',
                        padding: '8px 2px',
                        wordBreak: 'keep-all',
                        lineHeight: 1.3,
                        position: 'sticky',
                        top: 0,
                        background: 'var(--surface-2)',
                        zIndex: 2,
                      }}
                    >
                      {al.allergenName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuMatrix.map((row, i) => {
                  const rowKey =
                    asDisplayText(row.rowKey) ||
                    asDisplayText(row.menuCode) ||
                    asDisplayText(row.menuName);
                  const crust = asDisplayText(row.crust);
                  const allergenCodes =
                    row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
                  const groupKey = r =>
                    asDisplayText(r.menuCode) ||
                    asDisplayText(r.originalMenuName) ||
                    asDisplayText(r.menuName);
                  const next = menuMatrix[i + 1];
                  const isLastInGroup = !next || groupKey(next) !== groupKey(row);
                  return (
                    <tr
                      key={rowKey}
                      style={
                        isLastInGroup
                          ? { borderBottom: '2px solid var(--text-3)' }
                          : undefined
                      }
                    >
                      <td
                        style={{
                          fontWeight: 600,
                          position: 'sticky',
                          left: 0,
                          background: 'var(--surface)',
                          zIndex: 1,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          style={{
                            border: 0,
                            background: 'transparent',
                            padding: 0,
                            cursor: 'pointer',
                            font: 'inherit',
                            color: 'inherit',
                            textAlign: 'left',
                          }}
                          title="식자재 알레르기 상세 보기"
                        >
                          {asDisplayText(row.menuName)}
                          {crust && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 999,
                                background: 'var(--surface-3)',
                                color: 'var(--text-2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {crust}
                            </span>
                          )}
                        </button>
                      </td>
                      <td>
                        <span className="chip">{asDisplayText(row.category)}</span>
                      </td>
                      {orderedAllergens.map(al => {
                        const allergenCode = asDisplayText(al.allergenCode);
                        const has = allergenCodes.has(allergenCode);
                        return (
                          <td key={allergenCode} style={{ textAlign: 'center' }}>
                            {has ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  background: 'var(--accent)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {viewMode === 'ingredient'
          ? `${ingredientRows.length}개 식자재`
          : `${menuMatrix.length}개 메뉴`}{' '}
        표시
      </div>

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
      {detailRow && (
        <ModalFrame
          title={`${asDisplayText(detailRow.menuName)}${detailRow.crust ? ` · ${detailRow.crust}` : ''}`}
          onClose={() => setDetailRow(null)}
          width="min(760px, 96vw)"
          padding="22px 24px"
          zIndex={300}
        >
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            {detailRow.kind === 'topping'
              ? '추가토핑 탭에서 연결한 식자재 알레르기입니다.'
              : '직접 레시피, 묶음관리, 엣지관리에서 이 메뉴에 반영된 식자재 알레르기입니다.'}
          </div>
          {detailRows.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-title">상세 식자재가 없습니다</div>
              <div className="empty-sub">알레르기 식자재 매칭 정보를 찾지 못했습니다.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 680 }}>
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>출처</th>
                    <th>식자재명</th>
                    <th style={{ width: 110 }}>코드</th>
                    <th style={{ width: 110 }}>카테고리</th>
                    <th style={{ width: 180 }}>알레르기</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map(row => (
                    <tr key={row.key}>
                      <td style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>
                        {row.sourceText}
                      </td>
                      <td style={{ fontWeight: 700 }}>{row.ingredientName}</td>
                      <td className="mono muted">{row.productCode || '—'}</td>
                      <td>{row.category || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {row.allergens.map(code => {
                            const allergen = ALLERGEN_SEED.find(
                              item => asDisplayText(item.allergenCode) === code
                            );
                            return (
                              <span
                                key={code}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 999,
                                  background: 'var(--warn-soft)',
                                  color: 'var(--warn)',
                                }}
                              >
                                {asDisplayText(allergen?.allergenName, code)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalFrame>
      )}
    </main>
  );
}
