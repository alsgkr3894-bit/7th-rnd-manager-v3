'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
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
import { buildIngredientMenuMap, getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';
import { ReorderModal } from '@/components/ui/ReorderModal';
import { MENU_ORDER_KEY, loadOrder, saveOrder, applyOrder } from '@/lib/nutrition/order';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';

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
    setIngredients(ings);
    setMenuMasters(masters);
    const detailRecipes = tagDetailRecipes(pizzaRecs, personalRecs, sideRecs, setRecs);
    setMapData(
      buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        oldRecipes: oldRecs,
        groups,
        edges,
      })
    );
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);
  useVisibilityRefresh(load);

  // 원산지 있는 식자재만
  const originIngredients = useMemo(
    () =>
      ingredients.filter(
        i => i.origin?.length && !i.discontinued && !i.excluded && !i.originHidden
      ),
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
      excludedMenuCodes.has(menuCode) || excludedMenuNames.has((menuName || '').trim()),
    [excludedMenuCodes, excludedMenuNames]
  );

  // ── 식자재 기준 뷰 ─────────────────────────────────────────
  const ingredientRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = originIngredients.filter(ing => {
      if (!q) return true;
      const menus = getMenusForIngredient(
        mapData.ingredientToMenus,
        ing.productCode,
        ing.ingredientName
      );
      const menuText = [...menus.entries()]
        .filter(([mc, m]) => !isExcludedMenu(mc, m.menuName))
        .map(([, m]) => m.menuName)
        .join(' ');
      const originText = (ing.origin || [])
        .map(it => `${it.displayName || ''} ${it.country || ''}`)
        .join(' ');
      return (
        (ing.ingredientName || '').toLowerCase().includes(q) ||
        originText.toLowerCase().includes(q) ||
        (ing.productCode || '').toLowerCase().includes(q) ||
        menuText.toLowerCase().includes(q)
      );
    });
    // 식자재별 보기는 식자재명 ㄱㄴㄷ 순
    return filtered.sort((a, b) =>
      (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko')
    );
  }, [originIngredients, search, mapData, isExcludedMenu]);

  // ── 메뉴 기준 뷰 ───────────────────────────────────────────
  const menuRowsAll = useMemo(() => {
    const ingByKey = new Map();
    for (const ing of originIngredients) {
      if (ing.productCode) ingByKey.set(`code:${ing.productCode}`, ing);
      const n = (ing.ingredientName || '').trim().toLowerCase().replace(/\s+/g, '');
      if (n) ingByKey.set(`name:${n}`, ing);
    }

    const menuMap = new Map(); // menuCode → { menuName, category, origins: [{displayName, country, region}] }
    for (const [key, menus] of mapData.ingredientToMenus) {
      const ing = ingByKey.get(key);
      if (!ing?.origin?.length) continue;
      for (const [menuCode, meta] of menus) {
        if (isExcludedMenu(menuCode, meta.menuName)) continue;
        if (!menuMap.has(menuCode)) menuMap.set(menuCode, { ...meta, menuCode, origins: [] });
        const existing = menuMap.get(menuCode).origins;
        for (const it of ing.origin || []) {
          const label = it.displayName || ing.ingredientName;
          const dup = existing.find(o => o.country === it.country && o.displayName === label);
          if (!dup) existing.push({ displayName: label, country: it.country });
        }
      }
    }

    // 사용자가 정한 메뉴 순서 적용 (없는 메뉴는 뒤에 ㄱㄴㄷ)
    return applyOrder(
      [...menuMap.values()],
      menuOrder,
      m => m.menuCode,
      m => m.menuName
    );
  }, [originIngredients, mapData, isExcludedMenu, menuOrder]);

  const menuRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return menuRowsAll;
    return menuRowsAll.filter(
      r =>
        (r.menuName || '').toLowerCase().includes(q) ||
        r.origins.some(
          o => o.displayName.toLowerCase().includes(q) || o.country.toLowerCase().includes(q)
        )
    );
  }, [menuRowsAll, search]);

  const totalWithOrigin = originIngredients.length;
  const totalIngredients = ingredients.filter(i => !i.discontinued && !i.excluded).length;

  const withoutOrigin = totalIngredients - totalWithOrigin;

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
        {viewMode === 'menu' && (
          <button
            className="btn sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setReorderOpen(true)}
          >
            메뉴 순서 변경
          </button>
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
                  const allMenus = getMenusForIngredient(
                    mapData.ingredientToMenus,
                    ing.productCode,
                    ing.ingredientName
                  );
                  const menus = new Map(
                    [...allMenus].filter(([mc, m]) => !isExcludedMenu(mc, m.menuName))
                  );
                  const menuList = [...menus.values()];
                  return (
                    <tr key={ing.id || ing.productCode || ing.ingredientName}>
                      <td style={{ fontWeight: 600 }}>{ing.ingredientName}</td>
                      <td style={{ color: 'var(--text-2)' }}>
                        {(ing.origin || [])
                          .map(it => it.displayName || ing.ingredientName)
                          .join(' · ')}
                      </td>
                      <td>
                        {(ing.origin || []).map((it, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span style={{ color: 'var(--text-4)', margin: '0 4px' }}>/</span>
                            )}
                            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                              {it.country}
                            </span>
                          </span>
                        ))}
                      </td>
                      <td className="mono muted">{ing.productCode || '—'}</td>
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
                          .map(m => m.menuName)
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
              {menuRows.map(row => (
                <tr key={row.menuCode}>
                  <td style={{ fontWeight: 600 }}>{row.menuName}</td>
                  <td>
                    <span className="chip">{row.category}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {row.origins.map((o, i) => (
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
                          <span style={{ color: 'var(--text-2)' }}>{o.displayName}</span>
                          <span style={{ color: 'var(--text-4)' }}>:</span>
                          <span style={{ color: 'var(--text-1)' }}>{o.country}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
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
          items={menuRowsAll.map(m => ({ key: m.menuCode, label: m.menuName }))}
          onApply={keys => {
            saveOrder(MENU_ORDER_KEY, keys);
            setMenuOrder(keys);
          }}
          onClose={() => setReorderOpen(false)}
        />
      )}
    </main>
  );
}
