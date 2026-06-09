'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { downloadCsv } from '@/lib/download';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllRecipes } from '@/lib/recipe';
import { buildIngredientMenuMap, getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';
import { ReorderModal } from '@/components/ui/ReorderModal';
import { MENU_ORDER_KEY, loadOrder, saveOrder, applyOrder } from '@/lib/nutrition/order';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuNames, saveMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const EMPTY_MENU_MAP = new Map();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);

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
  const mountedRef = useRef(true);

  useEffect(() => {
    setMenuOrder(loadOrder(MENU_ORDER_KEY));
  }, []);

  const load = useCallback(async () => {
    await initDB();
    const [ings, masters, groups, edges, pizzaRecs, personalRecs, sideRecs, setRecs, oldRecs] =
      await Promise.all([
        getAllIngredients(),
        getAllMenuMaster(),
        getAllRecipeGroups(),
        getAllEdges(),
        getAllPizzaRecipes(),
        getAllPersonalRecipes(),
        getAllSideRecipes(),
        getAllSetRecipes(),
        getAllRecipes(),
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
    setMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        oldRecipes: safeOldRecipes,
        groups: safeGroups,
        edges: safeEdges,
      })
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load()
      .catch(err => {
        if (mountedRef.current) console.error(err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [load]);
  useVisibilityRefresh(load);

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
  const ingredientRows = useMemo(() => {
    const q = asDisplayText(search).toLowerCase().trim();
    const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
    const filtered = originIngredients.filter(ing => {
      if (!q) return true;
      const productCode = asDisplayText(ing.productCode);
      const ingredientName = asDisplayText(ing.ingredientName);
      const menus = getMenusForIngredient(ingredientToMenus, productCode, ingredientName);
      const menuText = [...menus.entries()]
        .filter(([mc, m]) => !isExcludedMenu(mc, m?.menuName))
        .map(([, m]) => asDisplayText(m?.menuName))
        .join(' ');
      const originText = asObjectArray(ing.origin)
        .map(it => `${asDisplayText(it.displayName)} ${asDisplayText(it.country)}`)
        .join(' ');
      return (
        ingredientName.toLowerCase().includes(q) ||
        originText.toLowerCase().includes(q) ||
        productCode.toLowerCase().includes(q) ||
        menuText.toLowerCase().includes(q)
      );
    });
    // 식자재별 보기는 식자재명 ㄱㄴㄷ 순
    return filtered.sort((a, b) =>
      asDisplayText(a.ingredientName).localeCompare(asDisplayText(b.ingredientName), 'ko')
    );
  }, [originIngredients, search, mapData, isExcludedMenu]);

  // ── 메뉴 기준 뷰 ───────────────────────────────────────────
  const menuRowsAll = useMemo(() => {
    const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
    const ingByKey = new Map();
    for (const ing of originIngredients) {
      const productCode = asDisplayText(ing.productCode);
      const ingredientName = asDisplayText(ing.ingredientName);
      if (productCode) ingByKey.set(`code:${productCode}`, ing);
      const n = ingredientName.trim().toLowerCase().replace(/\s+/g, '');
      if (n) ingByKey.set(`name:${n}`, ing);
    }

    const menuMap = new Map(); // menuCode → { menuName, category, origins: [{displayName, country, region}] }
    for (const [key, menus] of ingredientToMenus) {
      if (!(menus instanceof Map)) continue;
      const ing = ingByKey.get(key);
      const origins = asObjectArray(ing?.origin);
      if (!origins.length) continue;
      for (const [menuCode, meta] of menus) {
        if (isExcludedMenu(menuCode, meta?.menuName)) continue;
        if (!menuMap.has(menuCode)) menuMap.set(menuCode, { ...meta, menuCode, origins: [] });
        const existing = menuMap.get(menuCode).origins;
        for (const it of origins) {
          const label = asDisplayText(it.displayName) || asDisplayText(ing.ingredientName);
          const country = asDisplayText(it.country);
          const dup = existing.find(o => o.country === country && o.displayName === label);
          if (!dup) existing.push({ displayName: label, country });
        }
      }
    }

    // 사용자가 정한 메뉴 순서 적용 (없는 메뉴는 뒤에 ㄱㄴㄷ)
    const sorted = applyOrder(
      [...menuMap.values()],
      menuOrder,
      m => asDisplayText(m.menuCode),
      m => asDisplayText(m.menuName)
    );
    // 출력용 메뉴명 오버라이드 적용 (표시 전용, 원래 이름 보존)
    return sorted.map(m => ({
      ...m,
      originalMenuName: asDisplayText(m.menuName),
      menuName: applyMenuName(
        asDisplayText(m.menuCode),
        asDisplayText(m.menuName),
        menuNameOverrides
      ),
    }));
  }, [originIngredients, mapData, isExcludedMenu, menuOrder, menuNameOverrides]);

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
      downloadCsv([headers, ...rows], '원산지_식자재별.csv');
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
    downloadCsv([headers, ...rows], '원산지_메뉴별.csv');
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '원산지 정보']}
        title="원산지 정보"
        masterSource
        sub="식자재 관리에서 식자재별 원산지를 입력하면 자동으로 매칭됩니다"
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="원산지 등록 식자재" value={totalWithOrigin} />
        <SmallStatCard label="전체 식자재" value={totalIngredients} />
        <SmallStatCard
          label="미등록"
          value={withoutOrigin}
          valueColor={withoutOrigin > 0 ? 'var(--warn)' : undefined}
        />
        <SmallStatCard label="매핑 메뉴 수" value={menuRows.length} />
      </div>

      {withoutOrigin > 0 && (
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
          원산지 미등록 식자재 {withoutOrigin}개 —{' '}
          <Link href="/ingredient/manage" style={{ color: 'inherit', textDecoration: 'underline' }}>
            식자재 관리에서 입력
          </Link>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="식자재명·메뉴명·원산지 검색" />
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('ingredient')}
            style={{
              padding: '8px 14px',
              border: 0,
              background: 'transparent',
              fontSize: 13,
              fontWeight: viewMode === 'ingredient' ? 700 : 500,
              color: viewMode === 'ingredient' ? 'var(--accent)' : 'var(--text-3)',
              borderBottom:
                viewMode === 'ingredient' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            식자재별
          </button>
          <button
            onClick={() => setViewMode('menu')}
            style={{
              padding: '8px 14px',
              border: 0,
              background: 'transparent',
              fontSize: 13,
              fontWeight: viewMode === 'menu' ? 700 : 500,
              color: viewMode === 'menu' ? 'var(--accent)' : 'var(--text-3)',
              borderBottom:
                viewMode === 'menu' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            메뉴별
          </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="btn sm"
            onClick={exportCsv}
            disabled={
              viewMode === 'ingredient' ? ingredientRows.length === 0 : menuRows.length === 0
            }
          >
            CSV 내보내기
          </button>
          {hiddenCount > 0 && (
            <button
              className={'btn sm' + (showHidden ? ' active' : '')}
              onClick={() => setShowHidden(v => !v)}
              title="미표시대상으로 지정된 식자재 포함 여부"
            >
              {showHidden
                ? `미표시대상 ${hiddenCount}개 포함 중`
                : `미표시대상 ${hiddenCount}개 숨김`}
            </button>
          )}
          {viewMode === 'menu' && (
            <>
              <button className="btn sm" onClick={() => setMenuNameEditOpen(true)}>
                메뉴명 편집
              </button>
              <button className="btn sm" onClick={() => setReorderOpen(true)}>
                메뉴 순서 변경
              </button>
              {menuOrder.length > 0 && (
                <button
                  className="btn sm"
                  onClick={() => {
                    saveOrder(MENU_ORDER_KEY, []);
                    setMenuOrder([]);
                  }}
                  title="저장된 메뉴 순서를 지우고 기본(ㄱㄴㄷ) 순서로 복원"
                >
                  순서 초기화
                </button>
              )}
            </>
          )}
        </div>
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
                <Icon.tag style={{ width: 28, height: 28 }} />
              </div>
              <div className="empty-title">원산지 등록 식자재가 없어요</div>
              <div className="empty-sub">
                <Link href="/ingredient/manage">식자재 관리</Link>에서 식자재별 원산지를 입력하세요
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>식자재명</th>
                  <th>표시품목명</th>
                  <th>원산지</th>
                  <th>제때 코드</th>
                  <th>매칭 메뉴 수</th>
                  <th>매칭 메뉴 (일부)</th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map(ing => {
                  const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
                  const productCode = asDisplayText(ing.productCode);
                  const ingredientName = asDisplayText(ing.ingredientName);
                  const origins = asObjectArray(ing.origin);
                  const allMenus = getMenusForIngredient(
                    ingredientToMenus,
                    productCode,
                    ingredientName
                  );
                  const menus = new Map(
                    [...allMenus].filter(([mc, m]) => !isExcludedMenu(mc, m?.menuName))
                  );
                  const menuList = [...menus.values()];
                  return (
                    <tr key={asDisplayText(ing.id) || productCode || ingredientName}>
                      <td style={{ fontWeight: 600 }}>{ingredientName}</td>
                      <td style={{ color: 'var(--text-2)' }}>
                        {origins
                          .map(it => asDisplayText(it.displayName) || ingredientName)
                          .join(' · ')}
                      </td>
                      <td>
                        {origins.map((it, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span style={{ color: 'var(--text-4)', margin: '0 4px' }}>/</span>
                            )}
                            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                              {asDisplayText(it.country)}
                            </span>
                          </span>
                        ))}
                      </td>
                      <td className="mono muted">{productCode || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {menus.size > 0 ? (
                          <span style={{ fontWeight: 700, color: 'var(--positive)' }}>
                            {menus.size}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-4)' }}>0</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {menuList
                          .slice(0, 3)
                          .map(m => asDisplayText(m?.menuName))
                          .join(', ')}
                        {menuList.length > 3 && ` 외 ${menuList.length - 3}개`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : // 메뉴별 뷰
        menuRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <Icon.doc style={{ width: 28, height: 28 }} />
            </div>
            <div className="empty-title">표시할 메뉴가 없어요</div>
            <div className="empty-sub">
              식자재에 원산지를 등록하고 원가 레시피에 구성품을 추가하면 자동 매칭됩니다
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>메뉴명</th>
                <th>카테고리</th>
                <th>표시품목 · 원산지</th>
              </tr>
            </thead>
            <tbody>
              {menuRows.map(row => {
                const origins = asObjectArray(row.origins);
                const menuCode = asDisplayText(row.menuCode);
                const menuName = asDisplayText(row.menuName);
                return (
                  <tr key={menuCode || menuName}>
                    <td style={{ fontWeight: 600 }}>{menuName}</td>
                    <td>
                      <span className="chip">{asDisplayText(row.category)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {origins.map((o, i) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              background: 'var(--surface-2)',
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <span style={{ color: 'var(--text-2)' }}>
                              {asDisplayText(o.displayName)}
                            </span>
                            <span style={{ color: 'var(--text-4)' }}>:</span>
                            <span style={{ color: 'var(--text-1)' }}>
                              {asDisplayText(o.country)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {viewMode === 'ingredient'
          ? `${ingredientRows.length}개 식자재`
          : `${menuRows.length}개 메뉴`}{' '}
        표시
      </div>

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
