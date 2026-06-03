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
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';
import { ReorderModal } from '@/components/ui/ReorderModal';
import {
  MENU_ORDER_KEY,
  ALLERGEN_ORDER_KEY,
  loadOrder,
  saveOrder,
  applyOrder,
} from '@/lib/nutrition/order';

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
// 메뉴별 매트릭스 크러스트/엣지 변형 (기본=석쇠, edgeType은 getAllEdges의 값과 일치)
const CRUST_VARIANTS = [
  { key: '석쇠', label: '석쇠', edgeType: null },
  { key: '치즈크러스트', label: '치즈크러스트', edgeType: '치즈크러스트' },
  { key: '골드스윗', label: '골드스윗', edgeType: '골드스윗크러스트' },
  { key: '씬바사삭', label: '씬바사삭(씬도우)', edgeType: '씬도우' },
];
const normStr = s => (s || '').trim().toLowerCase().replace(/\s+/g, '');

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('ingredient'); // 'ingredient' | 'menu'
  const [menuOrder, setMenuOrder] = useState([]);
  const [allergenOrder, setAllergenOrder] = useState([]);
  const [reorderTarget, setReorderTarget] = useState(null); // 'menu' | 'allergen' | null

  useEffect(() => {
    setMenuOrder(loadOrder(MENU_ORDER_KEY));
    setAllergenOrder(loadOrder(ALLERGEN_ORDER_KEY));
  }, []);

  // 알레르기 22종 표시 순서 — 저장된 순서 우선, 없으면 기본 displayOrder
  const orderedAllergens = useMemo(() => {
    if (!allergenOrder.length) return ALLERGEN_SEED;
    const rank = new Map(allergenOrder.map((c, i) => [c, i]));
    return [...ALLERGEN_SEED].sort((a, b) => {
      const ra = rank.has(a.allergenCode) ? rank.get(a.allergenCode) : Infinity;
      const rb = rank.has(b.allergenCode) ? rank.get(b.allergenCode) : Infinity;
      if (ra !== rb) return ra - rb;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }, [allergenOrder]);

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
    setEdges(edges);
    const detailRecipes = [
      ...pizzaRecs.map(r => ({ ...r, category: '피자' })),
      ...personalRecs.map(r => ({ ...r, category: '1인피자' })),
      ...sideRecs.map(r => ({ ...r, category: '사이드' })),
      ...setRecs.map(r => ({ ...r, category: '세트박스' })),
    ];
    setMapData(
      buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        oldRecipes: oldRecs,
        groups,
        edges,
      })
    );
    // 엣지 제외 base 맵 — 크러스트 변형별 알레르겐 분리용 (석쇠 = 엣지 없는 기본)
    setBaseMapData(
      buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        oldRecipes: oldRecs,
        groups,
        edges: [],
      })
    );
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);
  useVisibilityRefresh(load);

  // 알레르기 있는 식자재
  const allergenIngredients = useMemo(
    () => ingredients.filter(i => i.allergens?.length && !i.discontinued && !i.excluded),
    [ingredients]
  );

  // 원산지·알레르기 출력에서 제외된 메뉴 — menuCode + menuName 양쪽 매칭
  const { excludedMenuCodes, excludedMenuNames } = useMemo(() => {
    const ex = menuMasters.filter(m => m.excludeFromOrigin);
    return {
      excludedMenuCodes: new Set(ex.map(m => m.menuCode).filter(Boolean)),
      excludedMenuNames: new Set(ex.map(m => (m.menuName || '').trim()).filter(Boolean)),
    };
  }, [menuMasters]);
  const isExcludedMenu = useCallback(
    (menuCode, menuName) =>
      excludedMenuCodes.has(menuCode) || excludedMenuNames.has((menuName || '').trim()),
    [excludedMenuCodes, excludedMenuNames]
  );

  // ── 식자재 기준 뷰 ─────────────────────────────────────────
  const ingredientRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allergenIngredients.filter(ing => {
      if (!q) return true;
      const allergenNames = ALLERGEN_SEED.filter(a =>
        (ing.allergens || []).includes(a.allergenCode)
      )
        .map(a => a.allergenName)
        .join(' ');
      return (
        (ing.ingredientName || '').toLowerCase().includes(q) ||
        (ing.productCode || '').toLowerCase().includes(q) ||
        allergenNames.toLowerCase().includes(q)
      );
    });
  }, [allergenIngredients, search]);

  // ── 메뉴별 매트릭스 뷰 (피자는 크러스트/엣지 변형별 행) ──────
  const menuMatrixAll = useMemo(() => {
    // 알레르겐 보유 식자재 키맵
    const ingByKey = new Map();
    for (const ing of allergenIngredients) {
      if (ing.productCode) ingByKey.set(`code:${ing.productCode}`, ing);
      const n = normStr(ing.ingredientName);
      if (n) ingByKey.set(`name:${n}`, ing);
    }

    // 엣지타입 → 알레르겐 집합 (해당 엣지 구성재료의 알레르겐)
    const edgeAllergens = new Map();
    for (const edge of edges) {
      if (!edge?.edgeType) continue;
      if (!edgeAllergens.has(edge.edgeType)) edgeAllergens.set(edge.edgeType, new Set());
      const set = edgeAllergens.get(edge.edgeType);
      for (const c of edge.components || []) {
        const key = c.productCode ? `code:${c.productCode}` : `name:${normStr(c.ingredientName)}`;
        const ing = ingByKey.get(key);
        if (ing) for (const code of ing.allergens) set.add(code);
      }
    }

    // base(엣지 제외) 메뉴별 알레르겐 — 석쇠 기준.
    // codes=전체(도우 포함), nonDoughCodes=도우 재료 제외 (씬바사삭은 석쇠 도우를 씬도우로 교체)
    const menuBase = new Map(); // menuCode → { meta, codes:Set, nonDoughCodes:Set }
    for (const [key, menus] of baseMapData.ingredientToMenus) {
      const ing = ingByKey.get(key);
      if (!ing?.allergens?.length) continue;
      const isDough = (ing.category || '').startsWith('도우'); // '도우/밀가루'
      for (const [menuCode, meta] of menus) {
        if (isExcludedMenu(menuCode, meta.menuName)) continue;
        if (!menuBase.has(menuCode))
          menuBase.set(menuCode, { meta, codes: new Set(), nonDoughCodes: new Set() });
        const e = menuBase.get(menuCode);
        for (const code of ing.allergens) {
          e.codes.add(code);
          if (!isDough) e.nonDoughCodes.add(code);
        }
      }
    }

    // 행 생성: 피자는 4변형, 그 외 단일
    //  · 석쇠 = base 전체
    //  · 치즈크러스트/골드스윗 = base 전체 + 해당 엣지 (석쇠에 더함)
    //  · 씬바사삭 = base에서 도우 제외 + 씬도우 (도우만 교체)
    const rows = [];
    for (const [menuCode, { meta, codes, nonDoughCodes }] of menuBase) {
      const isPizza = (meta.category || '').startsWith('피자');
      if (!isPizza) {
        rows.push({ rowKey: menuCode, menuCode, ...meta, crust: '', allergenCodes: codes });
        continue;
      }
      for (const v of CRUST_VARIANTS) {
        const merged = new Set(v.key === '씬바사삭' ? nonDoughCodes : codes);
        if (v.edgeType) for (const code of edgeAllergens.get(v.edgeType) || []) merged.add(code);
        rows.push({
          rowKey: `${menuCode}__${v.key}`,
          menuCode,
          ...meta,
          crust: v.label,
          allergenCodes: merged,
        });
      }
    }

    // 사용자 메뉴 순서 적용 — menuCode 단위로 정렬하므로 같은 메뉴의 변형(석쇠+엣지) 행이
    // 함께 묶여 이동하고, 변형 간 순서는 CRUST_VARIANTS 삽입순(안정 정렬)으로 유지됨.
    return applyOrder(
      rows,
      menuOrder,
      r => r.menuCode,
      r => r.menuName
    );
  }, [allergenIngredients, baseMapData, edges, isExcludedMenu, menuOrder]);

  const menuMatrix = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return menuMatrixAll;
    return menuMatrixAll.filter(
      r =>
        (r.menuName || '').toLowerCase().includes(q) ||
        (r.crust || '').toLowerCase().includes(q) ||
        ALLERGEN_SEED.filter(a => r.allergenCodes.has(a.allergenCode)).some(a =>
          a.allergenName.toLowerCase().includes(q)
        )
    );
  }, [menuMatrixAll, search]);

  // 순서 변경 모달용 — 메뉴 1개씩(변형 제외, menuCode 중복 제거)
  const menuListForOrder = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of menuMatrixAll) {
      if (seen.has(r.menuCode)) continue;
      seen.add(r.menuCode);
      out.push({ key: r.menuCode, label: r.menuName });
    }
    return out;
  }, [menuMatrixAll]);

  const totalWithAllergen = allergenIngredients.length;
  const totalIngredients = ingredients.filter(i => !i.discontinued && !i.excluded).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        masterSource
        sub="식자재 관리에서 식자재별 알레르기 항목을 체크하면 자동으로 메뉴에 매칭됩니다"
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
              key={al.allergenCode}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
              }}
            >
              {al.allergenName}
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
            <button className="btn sm" onClick={() => setReorderTarget('menu')}>
              메뉴 순서
            </button>
            <button className="btn sm" onClick={() => setReorderTarget('allergen')}>
              알레르기 순서
            </button>
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
                  const allMenus = getMenusForIngredient(
                    mapData.ingredientToMenus,
                    ing.productCode,
                    ing.ingredientName
                  );
                  const menus = new Map(
                    [...allMenus].filter(([mc, m]) => !isExcludedMenu(mc, m.menuName))
                  );
                  const allergenNames = ALLERGEN_SEED.filter(a =>
                    (ing.allergens || []).includes(a.allergenCode)
                  ).map(a => a.allergenName);
                  return (
                    <tr key={ing.id || ing.productCode || ing.ingredientName}>
                      <td style={{ fontWeight: 600 }}>{ing.ingredientName}</td>
                      <td className="mono muted">{ing.productCode || '—'}</td>
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
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      minWidth: 160,
                      position: 'sticky',
                      left: 0,
                      background: 'var(--surface-2)',
                      zIndex: 2,
                    }}
                  >
                    메뉴명
                  </th>
                  <th style={{ width: 80 }}>카테고리</th>
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
                      }}
                    >
                      {al.allergenName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuMatrix.map(row => (
                  <tr key={row.rowKey}>
                    <td
                      style={{
                        fontWeight: 600,
                        position: 'sticky',
                        left: 0,
                        background: 'var(--surface)',
                        zIndex: 1,
                      }}
                    >
                      {row.menuName}
                      {row.crust && (
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
                          {row.crust}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="chip">{row.category}</span>
                    </td>
                    {orderedAllergens.map(al => {
                      const has = row.allergenCodes.has(al.allergenCode);
                      return (
                        <td key={al.allergenCode} style={{ textAlign: 'center' }}>
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
                ))}
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
            saveOrder(MENU_ORDER_KEY, keys);
            setMenuOrder(keys);
          }}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {reorderTarget === 'allergen' && (
        <ReorderModal
          title="알레르기 22종 순서"
          items={orderedAllergens.map(a => ({ key: a.allergenCode, label: a.allergenName }))}
          onApply={keys => {
            saveOrder(ALLERGEN_ORDER_KEY, keys);
            setAllergenOrder(keys);
          }}
          onClose={() => setReorderTarget(null)}
        />
      )}
    </main>
  );
}
